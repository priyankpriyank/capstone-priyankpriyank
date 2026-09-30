const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Profile API Endpoints (/api/profile)", () => {
  const userEmail = `profile-${Date.now()}@example.com`;
  const otherEmail = `other-${Date.now()}@example.com`;
  const initialPassword = "P@ssword123!";
  let currentEmail = userEmail;
  let authCookie = null;
  let testUserId = null;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    // Create main test user
    const res = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, 'User', 'active')
       RETURNING user_id`,
      ["Original Name", userEmail, passwordHash]
    );
    testUserId = res.rows[0].user_id;

    // Create a second user to test duplicate email collision on update
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, 'User', 'active')`,
      ["Other User", otherEmail, passwordHash]
    );

    // Login to obtain authentication cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: userEmail,
        password: initialPassword
      });

    authCookie = loginRes.headers["set-cookie"];
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE user_id = $1 OR email = $2",
      [testUserId, otherEmail]
    );
    await pool.end();
  });

  describe("GET /api/profile", () => {
    test("API-P01: rejects request when unauthenticated", async () => {
      const response = await request(app).get("/api/profile");

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Authentication required");
    });

    test("API-P02: retrieves user profile with listing statistics (Req 2.1)", async () => {
      const response = await request(app)
        .get("/api/profile")
        .set("Cookie", authCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile).toBeDefined();

      const { profile } = response.body;
      expect(profile.user_id).toBe(String(testUserId));
      expect(profile.full_name).toBe("Original Name");
      expect(profile.email).toBe(userEmail);
      expect(profile.role).toBe("User");
      expect(profile.account_status).toBe("active");
      expect(profile.created_at).toBeDefined();

      // Password hash must never be exposed
      expect(profile).not.toHaveProperty("password_hash");

      // Verify listing stats structure
      expect(profile.stats).toBeDefined();
      expect(profile.stats).toHaveProperty("active_listings");
      expect(profile.stats).toHaveProperty("sold_listings");
      expect(profile.stats).toHaveProperty("total_listings");
    });
  });

  describe("PUT /api/profile", () => {
    test("API-P03: rejects unauthenticated profile update", async () => {
      const response = await request(app)
        .put("/api/profile")
        .send({
          fullName: "New Name",
          email: "newemail@example.com"
        });

      expect(response.statusCode).toBe(401);
    });

    test("API-P04: rejects update with invalid or empty fields", async () => {
      const response = await request(app)
        .put("/api/profile")
        .set("Cookie", authCookie)
        .send({
          fullName: "",
          email: "invalid-email"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty("fullName");
      expect(response.body.errors).toHaveProperty("email");
    });

    test("API-P05: rejects update if email already belongs to another user (Req 1.1.3)", async () => {
      const response = await request(app)
        .put("/api/profile")
        .set("Cookie", authCookie)
        .send({
          fullName: "Original Name",
          email: otherEmail
        });

      expect(response.statusCode).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("An account with this email already exists");
    });

    test("API-P06: successfully updates profile full name and email (Req 2.2)", async () => {
      const updatedEmail = `updated-${Date.now()}@example.com`;

      const response = await request(app)
        .put("/api/profile")
        .set("Cookie", authCookie)
        .send({
          fullName: "Updated Full Name",
          email: updatedEmail
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Profile updated successfully");
      expect(response.body.user.full_name).toBe("Updated Full Name");
      expect(response.body.user.email).toBe(updatedEmail);

      currentEmail = updatedEmail;
    });
  });

  describe("PUT /api/profile/change-password", () => {
    const newPassword = "NewSecureP@ssword99#";

    test("API-P07: rejects unauthenticated password change", async () => {
      const response = await request(app)
        .put("/api/profile/change-password")
        .send({
          currentPassword: initialPassword,
          newPassword,
          confirmPassword: newPassword
        });

      expect(response.statusCode).toBe(401);
    });

    test("API-P08: rejects new password that violates policy rules (Req 1.1.2)", async () => {
      const response = await request(app)
        .put("/api/profile/change-password")
        .set("Cookie", authCookie)
        .send({
          currentPassword: initialPassword,
          newPassword: "short",
          confirmPassword: "short"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.newPassword).toBe("Password must be longer than 8 characters");
    });

    test("API-P09: rejects when current password is incorrect", async () => {
      const response = await request(app)
        .put("/api/profile/change-password")
        .set("Cookie", authCookie)
        .send({
          currentPassword: "WrongCurrentPassword1!",
          newPassword,
          confirmPassword: newPassword
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Current password is incorrect");
    });

    test("API-P10: successfully changes password and validates login with new password (Req 2.3)", async () => {
      const response = await request(app)
        .put("/api/profile/change-password")
        .set("Cookie", authCookie)
        .send({
          currentPassword: initialPassword,
          newPassword,
          confirmPassword: newPassword
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");

      // Verify that logging in with the old password fails
      const failLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: currentEmail,
          password: initialPassword
        });
      expect(failLogin.statusCode).toBe(401);

      // Verify that logging in with the new password succeeds
      const successLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: currentEmail,
          password: newPassword
        });
      expect(successLogin.statusCode).toBe(200);
      expect(successLogin.body.success).toBe(true);
    });
  });
});
