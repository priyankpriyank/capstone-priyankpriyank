const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");


//The API tests use a unique email so they won't collide with the test account you manually created earlier.

describe("POST /api/auth/register", () => {
  const testEmail = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );

    await pool.end();
  });


  //1


  test("API-01: registers a new user successfully", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "API Test User",
        email: testEmail,
        password: "Password@123"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Account created successfully");

    expect(response.body.user).toHaveProperty("user_id");
    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.role).toBe("User");
    expect(response.body.user.account_status).toBe("active");

    // Password hash must never be t
    expect(response.body.user).not.toHaveProperty("password_hash");
  });


  //2


  test("API-02: rejects duplicate email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Duplicate User",
        email: testEmail,
        password: "Password@123"
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "An account with this email already exists"
    );
  });
});