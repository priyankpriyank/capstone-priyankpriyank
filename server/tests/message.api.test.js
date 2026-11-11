const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Messaging API Endpoints (/api/messages - Week 7)", () => {
  const sellerEmail = `seller-msg-${Date.now()}@example.com`;
  const buyerEmail = `buyer-msg-${Date.now()}@example.com`;
  const thirdPartyEmail = `third-party-${Date.now()}@example.com`;
  const password = "P@ssword123!";

  let sellerId = null;
  let buyerId = null;
  let thirdPartyId = null;

  let sellerCookie = null;
  let buyerCookie = null;
  let thirdPartyCookie = null;

  let categoryId = null;
  let testListingId = null;
  let createdThreadId = null;

  beforeAll(async () => {
    // 1. Get or create active category
    const catRes = await pool.query(
      "SELECT category_id FROM categories WHERE active = true LIMIT 1"
    );
    if (catRes.rows.length > 0) {
      categoryId = catRes.rows[0].category_id;
    } else {
      const newCat = await pool.query(
        "INSERT INTO categories (category_name, active) VALUES ('Messaging Test Category', true) RETURNING category_id"
      );
      categoryId = newCat.rows[0].category_id;
    }

    const hash = await bcrypt.hash(password, 12);

    // 2. Create Seller
    const sRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, account_status) VALUES ('Seller User', $1, $2, 'User', 'active') RETURNING user_id",
      [sellerEmail, hash]
    );
    sellerId = sRes.rows[0].user_id;

    // 3. Create Buyer
    const bRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, account_status) VALUES ('Buyer User', $1, $2, 'User', 'active') RETURNING user_id",
      [buyerEmail, hash]
    );
    buyerId = bRes.rows[0].user_id;

    // 4. Create Third Party
    const tRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, account_status) VALUES ('Third Party User', $1, $2, 'User', 'active') RETURNING user_id",
      [thirdPartyEmail, hash]
    );
    thirdPartyId = tRes.rows[0].user_id;

    // 5. Create a test listing owned by Seller
    const listRes = await pool.query(
      `INSERT INTO listings (owner_user_id, title, description, price, category_id, status)
       VALUES ($1, 'Sony WH-1000XM4 Test Item', 'Great condition headphones', 199.99, $2, 'active')
       RETURNING listing_id`,
      [sellerId, categoryId]
    );
    testListingId = listRes.rows[0].listing_id;

    // 6. Log in all 3 users
    const sLogin = await request(app).post("/api/auth/login").send({ email: sellerEmail, password });
    sellerCookie = sLogin.headers["set-cookie"];

    const bLogin = await request(app).post("/api/auth/login").send({ email: buyerEmail, password });
    buyerCookie = bLogin.headers["set-cookie"];

    const tLogin = await request(app).post("/api/auth/login").send({ email: thirdPartyEmail, password });
    thirdPartyCookie = tLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    // Cleanup messages, threads, listing, users
    if (createdThreadId) {
      await pool.query("DELETE FROM messages WHERE thread_id = $1", [createdThreadId]);
      await pool.query("DELETE FROM message_threads WHERE thread_id = $1", [createdThreadId]);
    }
    if (testListingId) {
      await pool.query("DELETE FROM message_threads WHERE listing_id = $1", [testListingId]);
      await pool.query("DELETE FROM listings WHERE listing_id = $1", [testListingId]);
    }
    await pool.query("DELETE FROM users WHERE user_id IN ($1, $2, $3)", [
      sellerId,
      buyerId,
      thirdPartyId
    ]);
    await pool.end();
  });

  describe("POST /api/messages (Send Message on Listing - Req 5.1, 5.2, 5.5)", () => {
    test("API-M01: rejects message from unauthenticated user (401)", async () => {
      const response = await request(app)
        .post("/api/messages")
        .send({
          listingId: testListingId,
          content: "Hi! Is this still available?"
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("API-M02: rejects empty message content with 400 Bad Request", async () => {
      const response = await request(app)
        .post("/api/messages")
        .set("Cookie", buyerCookie)
        .send({
          listingId: testListingId,
          content: "    "
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.content).toBeDefined();
    });

    test("API-M03: rejects sending message to oneself on own listing (400)", async () => {
      const response = await request(app)
        .post("/api/messages")
        .set("Cookie", sellerCookie)
        .send({
          listingId: testListingId,
          content: "Can I buy my own item?"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("cannot message yourself");
    });

    test("API-M04: buyer sends message to listing owner; creates new thread (Req 5.1, 5.5)", async () => {
      const response = await request(app)
        .post("/api/messages")
        .set("Cookie", buyerCookie)
        .send({
          listingId: testListingId,
          content: "Hello! Is this item still available?"
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.threadId).toBeDefined();
      expect(response.body.messageRecord).toBeDefined();
      expect(response.body.messageRecord.content).toBe("Hello! Is this item still available?");

      createdThreadId = response.body.threadId;

      // Verify encrypted storage in DB (Req 5.5, NF 2.2)
      const dbCheck = await pool.query(
        "SELECT encrypted_content FROM messages WHERE message_id = $1",
        [response.body.messageRecord.message_id]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].encrypted_content).not.toBe("Hello! Is this item still available?");
      expect(dbCheck.rows[0].encrypted_content.startsWith("enc:gcm:")).toBe(true);
    });

    test("API-M05: thread reuse logic: sending another message reuses existing thread (Req 5.2)", async () => {
      const response = await request(app)
        .post("/api/messages")
        .set("Cookie", buyerCookie)
        .send({
          listingId: testListingId,
          content: "Would you take $180 for it?"
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      // MUST REUSE THE SAME THREAD ID (Req 5.2)
      expect(String(response.body.threadId)).toBe(String(createdThreadId));

      // Verify total threads for this listing & buyer remains 1
      const countRes = await pool.query(
        "SELECT COUNT(*) FROM message_threads WHERE listing_id = $1 AND buyer_user_id = $2",
        [testListingId, buyerId]
      );
      expect(Number(countRes.rows[0].count)).toBe(1);
    });
  });

  describe("GET /api/messages/inbox (Inbox Threads - Req 5.3)", () => {
    test("API-M06: retrieves inbox threads for authenticated user (Req 5.3)", async () => {
      const response = await request(app)
        .get("/api/messages/inbox")
        .set("Cookie", buyerCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.threads)).toBe(true);
      expect(response.body.threads.length).toBeGreaterThan(0);

      const thread = response.body.threads.find(
        (t) => String(t.thread_id) === String(createdThreadId)
      );
      expect(thread).toBeDefined();
      expect(thread.listing.title).toBe("Sony WH-1000XM4 Test Item");
      expect(thread.other_user.full_name).toBe("Seller User");
      expect(thread.last_message.text).toBe("Would you take $180 for it?");
    });

    test("API-M07: seller also sees the thread in their inbox", async () => {
      const response = await request(app)
        .get("/api/messages/inbox")
        .set("Cookie", sellerCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const thread = response.body.threads.find(
        (t) => String(t.thread_id) === String(createdThreadId)
      );
      expect(thread).toBeDefined();
      expect(thread.other_user.full_name).toBe("Buyer User");
    });
  });

  describe("GET /api/messages/threads/:threadId (View Thread Messages - Req 5.4, 6.9)", () => {
    test("API-M08: participant opens thread and views decrypted messages (Req 5.4)", async () => {
      const response = await request(app)
        .get(`/api/messages/threads/${createdThreadId}`)
        .set("Cookie", buyerCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.thread).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBe(2);
      expect(response.body.messages[0].text).toBe("Hello! Is this item still available?");
      expect(response.body.messages[1].text).toBe("Would you take $180 for it?");
    });

    test("API-M09: non-participant is forbidden from viewing thread (Req 6.9 - 403 Forbidden)", async () => {
      const response = await request(app)
        .get(`/api/messages/threads/${createdThreadId}`)
        .set("Cookie", thirdPartyCookie);

      expect(response.statusCode).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Forbidden");
    });
  });

  describe("POST /api/messages/threads/:threadId (Reply to Thread - Req 5.4, 5.5)", () => {
    test("API-M10: seller replies to active thread successfully", async () => {
      const response = await request(app)
        .post(`/api/messages/threads/${createdThreadId}`)
        .set("Cookie", sellerCookie)
        .send({
          content: "Yes, $180 works for me. When can you pick it up?"
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.messageRecord.content).toBe(
        "Yes, $180 works for me. When can you pick it up?"
      );

      // Verify thread now has 3 messages
      const getRes = await request(app)
        .get(`/api/messages/threads/${createdThreadId}`)
        .set("Cookie", sellerCookie);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.messages.length).toBe(3);
    });

    test("API-M11: non-participant cannot reply to thread (403)", async () => {
      const response = await request(app)
        .post(`/api/messages/threads/${createdThreadId}`)
        .set("Cookie", thirdPartyCookie)
        .send({
          content: "I want to butt in."
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/messages/listing/:listingId (Listing Thread Check)", () => {
    test("API-M12: returns exists: true and threadId for existing buyer-seller thread", async () => {
      const response = await request(app)
        .get(`/api/messages/listing/${testListingId}`)
        .set("Cookie", buyerCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(true);
      expect(String(response.body.threadId)).toBe(String(createdThreadId));
    });
  });
});

