const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Admin Moderation API Endpoints (/api/admin)", () => {
  const timestamp = Date.now();
  const adminEmail = `admin-${timestamp}@example.com`;
  const regularUserEmail = `user-${timestamp}@example.com`;
  const targetUserEmail = `target-${timestamp}@example.com`;
  const password = "P@ssword123!";

  let adminCookie = null;
  let adminUserId = null;
  let regularUserCookie = null;
  let regularUserId = null;
  let targetUserId = null;

  let testListingId = null;
  let testThreadId = null;
  let activeCategoryId = null;

  beforeAll(async () => {
    // 1. Ensure active category exists
    const catRes = await pool.query(
      "SELECT category_id FROM categories WHERE active = true LIMIT 1"
    );
    if (catRes.rows.length > 0) {
      activeCategoryId = catRes.rows[0].category_id;
    } else {
      const newCat = await pool.query(
        "INSERT INTO categories (category_name, active) VALUES ('AdminTestCat', true) RETURNING category_id"
      );
      activeCategoryId = newCat.rows[0].category_id;
    }

    const hash = await bcrypt.hash(password, 12);

    // 2. Create Admin user
    const adminRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ('System Administrator', $1, $2, 'Admin', 'active')
       RETURNING user_id`,
      [adminEmail, hash]
    );
    adminUserId = adminRes.rows[0].user_id;

    // 3. Create Regular user
    const regRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ('Regular Buyer', $1, $2, 'User', 'active')
       RETURNING user_id`,
      [regularUserEmail, hash]
    );
    regularUserId = regRes.rows[0].user_id;

    // 4. Create Target user for moderation
    const targetRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ('Moderation Target User', $1, $2, 'User', 'active')
       RETURNING user_id`,
      [targetUserEmail, hash]
    );
    targetUserId = targetRes.rows[0].user_id;

    // 5. Create test listing owned by target user
    const listingRes = await pool.query(
      `INSERT INTO listings (owner_user_id, title, description, price, category_id, status)
       VALUES ($1, 'Admin Moderation Test Item', 'Item to test admin delete', 150.00, $2, 'active')
       RETURNING listing_id`,
      [targetUserId, activeCategoryId]
    );
    testListingId = listingRes.rows[0].listing_id;

    // 6. Create private message thread between target user and regular user
    const threadRes = await pool.query(
      `INSERT INTO message_threads (listing_id, buyer_user_id, seller_user_id)
       VALUES ($1, $2, $3)
       RETURNING thread_id`,
      [testListingId, regularUserId, targetUserId]
    );
    testThreadId = threadRes.rows[0].thread_id;

    // 7. Login as Admin
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password });
    adminCookie = adminLogin.headers["set-cookie"];

    // 8. Login as Regular User
    const regLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: regularUserEmail, password });
    regularUserCookie = regLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    // Clean up created entities
    if (testListingId) {
      await pool.query("DELETE FROM messages WHERE thread_id = $1", [testThreadId]);
      await pool.query("DELETE FROM message_threads WHERE thread_id = $1", [testThreadId]);
      await pool.query("DELETE FROM listing_photos WHERE listing_id = $1", [testListingId]);
      await pool.query("DELETE FROM listings WHERE listing_id = $1", [testListingId]);
    }
    await pool.query("DELETE FROM users WHERE user_id IN ($1, $2, $3)", [
      adminUserId,
      regularUserId,
      targetUserId
    ]);
    await pool.end();
  });

  // --- ACCESS CONTROL (Req 1.5) ---
  describe("Admin Route Access Control (Req 1.5)", () => {
    test("API-A01: rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("API-A02: rejects non-admin users with 403 Forbidden (Req 1.5)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", regularUserCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/admin privileges required/i);
    });
  });

  // --- USER MODERATION (Req 6.1, 6.2, 6.3) ---
  describe("User Moderation (Req 6.1, 6.2, 6.3)", () => {
    test("API-A03: admin can view all user accounts (Req 6.1)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);

      const found = res.body.users.find(
        (u) => Number(u.user_id) === Number(targetUserId)
      );
      expect(found).toBeDefined();
      expect(found.email).toBe(targetUserEmail);
      expect(found.account_status).toBe("active");
    });

    test("API-A04: admin can deactivate a user account (Req 6.2)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "deactivated" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.account_status).toBe("deactivated");

      // Verify deactivated user cannot log in
      const loginAttempt = await request(app)
        .post("/api/auth/login")
        .send({ email: targetUserEmail, password });

      expect(loginAttempt.statusCode).toBe(403);
      expect(loginAttempt.body.message).toMatch(/not allowed to log in/i);
    });

    test("API-A05: admin can ban a user account (Req 6.3)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "banned" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.account_status).toBe("banned");

      // Verify banned user cannot log in
      const loginAttempt = await request(app)
        .post("/api/auth/login")
        .send({ email: targetUserEmail, password });

      expect(loginAttempt.statusCode).toBe(403);
    });

    test("API-A06: admin can reactivate an account", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "active" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.account_status).toBe("active");

      // Verify reactivated user can log in again
      const loginAttempt = await request(app)
        .post("/api/auth/login")
        .send({ email: targetUserEmail, password });

      expect(loginAttempt.statusCode).toBe(200);
      expect(loginAttempt.body.success).toBe(true);
    });

    test("API-A07: admin cannot deactivate or ban their own account", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUserId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "deactivated" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot deactivate or ban their own account/i);
    });

    test("API-A08: rejects invalid account status", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "invalid_status" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // --- LISTING MODERATION (Req 6.4, 6.5) ---
  describe("Listing Moderation (Req 6.4, 6.5)", () => {
    test("API-A09: admin can view all listings (Req 6.4)", async () => {
      const res = await request(app)
        .get("/api/admin/listings")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.listings)).toBe(true);

      const found = res.body.listings.find(
        (l) => Number(l.listing_id) === Number(testListingId)
      );
      expect(found).toBeDefined();
      expect(found.title).toBe("Admin Moderation Test Item");
    });

    test("API-A10: admin can delete any listing (Req 6.5)", async () => {
      const res = await request(app)
        .delete(`/api/admin/listings/${testListingId}`)
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);

      // Verify listing is gone
      const verifyRes = await request(app).get(`/api/listings/${testListingId}`);
      expect(verifyRes.statusCode).toBe(404);
      testListingId = null; // Prevent double delete in afterAll
    });

    test("API-A11: returns 404 when deleting a non-existent listing", async () => {
      const res = await request(app)
        .delete("/api/admin/listings/99999999")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // --- PRIVACY PROTECTION (Req 6.9) ---
  describe("Private Message Privacy Protection (Req 6.9)", () => {
    test("API-A12: admin CANNOT access private messages of threads they do not participate in (Req 6.9)", async () => {
      // 1. Create a listing between target and regular user
      const tempListingRes = await pool.query(
        `INSERT INTO listings (owner_user_id, title, description, price, category_id, status)
         VALUES ($1, 'Private Chat Listing', 'Privacy check item', 99.00, $2, 'active')
         RETURNING listing_id`,
        [targetUserId, activeCategoryId]
      );
      const tempListingId = tempListingRes.rows[0].listing_id;

      // 2. Create a private thread
      const tempThreadRes = await pool.query(
        `INSERT INTO message_threads (listing_id, buyer_user_id, seller_user_id)
         VALUES ($1, $2, $3)
         RETURNING thread_id`,
        [tempListingId, regularUserId, targetUserId]
      );
      const tempThreadId = tempThreadRes.rows[0].thread_id;

      try {
        const res = await request(app)
          .get(`/api/messages/threads/${tempThreadId}`)
          .set("Cookie", adminCookie);

        // Expect 403 Forbidden - admin has no backdoor to private user messages
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/not authorized to view this.*thread/i);
      } finally {
        await pool.query("DELETE FROM message_threads WHERE thread_id = $1", [tempThreadId]);
        await pool.query("DELETE FROM listings WHERE listing_id = $1", [tempListingId]);
      }
    });
  });
});
