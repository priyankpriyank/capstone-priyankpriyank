const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Listings API Endpoints (/api/listings)", () => {
  const sellerEmail = `seller-${Date.now()}@example.com`;
  const sellerPassword = "P@ssword123!";
  let authCookie = null;
  let testUserId = null;
  let activeCategoryId = null;
  let createdListingId = null;

  beforeAll(async () => {
    // 1. Ensure at least one active category exists
    const catRes = await pool.query(
      "SELECT category_id FROM categories WHERE active = true LIMIT 1"
    );
    if (catRes.rows.length > 0) {
      activeCategoryId = catRes.rows[0].category_id;
    } else {
      const newCat = await pool.query(
        "INSERT INTO categories (category_name, active) VALUES ('Electronics', true) RETURNING category_id"
      );
      activeCategoryId = newCat.rows[0].category_id;
    }

    // 2. Create test seller
    const hash = await bcrypt.hash(sellerPassword, 12);
    const userRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ('Listing Seller', $1, $2, 'User', 'active')
       RETURNING user_id`,
      [sellerEmail, hash]
    );
    testUserId = userRes.rows[0].user_id;

    // 3. Login to obtain cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: sellerEmail,
        password: sellerPassword
      });

    authCookie = loginRes.headers["set-cookie"];
  });

  afterAll(async () => {
    // Clean up created listing and user
    if (createdListingId) {
      await pool.query("DELETE FROM listing_photos WHERE listing_id = $1", [createdListingId]);
      await pool.query("DELETE FROM listings WHERE listing_id = $1", [createdListingId]);
    }
    await pool.query("DELETE FROM users WHERE user_id = $1", [testUserId]);
    await pool.end();
  });

  describe("POST /api/listings (Create Listing)", () => {
    test("API-08: rejects creation when unauthenticated (401)", async () => {
      const response = await request(app)
        .post("/api/listings")
        .send({
          title: "Test Laptop",
          description: "A great laptop",
          price: 499.99,
          categoryId: activeCategoryId,
          photos: ["/uploads/sample.jpg"]
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("API-09: rejects creation when price is <= 0 (Req 3.2.1)", async () => {
      const response = await request(app)
        .post("/api/listings")
        .set("Cookie", authCookie)
        .send({
          title: "Zero Price Item",
          description: "Free stuff",
          price: 0,
          categoryId: activeCategoryId,
          photos: ["/uploads/sample.jpg"]
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.price).toBe("Price must be greater than zero");
    });

    test("API-10: rejects creation when no photo is provided (Req 4.1.2)", async () => {
      const response = await request(app)
        .post("/api/listings")
        .set("Cookie", authCookie)
        .send({
          title: "Item Without Photos",
          description: "Missing photos",
          price: 45.0,
          categoryId: activeCategoryId,
          photos: []
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.photos).toBe("At least one listing photo is required");
    });

    test("API-11: creates listing successfully with valid data and photos (Req 4.1, 4.1.1, 4.1.2)", async () => {
      const response = await request(app)
        .post("/api/listings")
        .set("Cookie", authCookie)
        .send({
          title: "Sony WH-1000XM4 Headphones",
          description: "Noise cancelling headphones in mint condition with carrying case.",
          price: 249.99,
          categoryId: activeCategoryId,
          photos: ["/uploads/test-headphones-1.jpg", "/uploads/test-headphones-2.jpg"]
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Listing created successfully");

      const { listing } = response.body;
      expect(listing).toHaveProperty("listing_id");
      expect(listing.title).toBe("Sony WH-1000XM4 Headphones");
      expect(Number(listing.price)).toBe(249.99);
      expect(listing.status).toBe("active");
      expect(listing.photos).toHaveLength(2);

      createdListingId = listing.listing_id;
    });
  });

  describe("GET /api/listings (Active Listings)", () => {
    test("API-12: returns list of active listings (Req 4.2)", async () => {
      const response = await request(app).get("/api/listings");

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.listings)).toBe(true);

      const found = response.body.listings.find(
        (l) => String(l.listing_id) === String(createdListingId)
      );
      expect(found).toBeDefined();
      expect(found.title).toBe("Sony WH-1000XM4 Headphones");
      expect(found.seller_name).toBe("Listing Seller");
      expect(found.primary_photo).toBe("/uploads/test-headphones-1.jpg");
    });
  });

  describe("GET /api/listings/:id (Listing Details)", () => {
    test("API-13: returns listing details with seller and all photos (Req 4.3)", async () => {
      const response = await request(app).get(`/api/listings/${createdListingId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const { listing } = response.body;
      expect(String(listing.listing_id)).toBe(String(createdListingId));
      expect(listing.title).toBe("Sony WH-1000XM4 Headphones");
      expect(listing.seller_name).toBe("Listing Seller");
      expect(listing.seller_email).toBe(sellerEmail);
      expect(listing.photos).toHaveLength(2);
    });

    test("API-14: returns 404 for non-existent listing ID", async () => {
      const response = await request(app).get("/api/listings/99999999");

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Listing not found or does not exist");
    });
  });
});
