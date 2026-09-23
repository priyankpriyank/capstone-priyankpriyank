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

describe("POST /api/auth/login", () => {
  const loginTestEmail = `login-test-${Date.now()}@example.com`;
  const loginTestPassword = "Password@123";

  beforeAll(async () => {
    const bcrypt = require("bcrypt");

    const passwordHash = await bcrypt.hash(loginTestPassword, 12);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)`,
      [
        "Login Test User",
        loginTestEmail,
        passwordHash
      ]
    );
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [loginTestEmail]
    );
  });

  test("API-03: logs in successfully with valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: loginTestEmail,
        password: loginTestPassword
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Login successful");

    expect(response.body.user).toHaveProperty("user_id");
    expect(response.body.user.email).toBe(loginTestEmail);
    expect(response.body.user.role).toBe("User");

    // Password hash must never be returned
    expect(response.body.user).not.toHaveProperty("password_hash");

    // Authentication cookie should be created
    expect(response.headers["set-cookie"]).toBeDefined();

    expect(
      response.headers["set-cookie"].some((cookie) =>
        cookie.startsWith("nexto_token=")
      )
    ).toBe(true);
  });

  test("API-04: rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: loginTestEmail,
        password: "WrongPassword@123"
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });

  test("API-07: blocks banned users from logging in", async () => {
  const bannedEmail = `banned-${Date.now()}@example.com`;
  const password = "Password@123";
  const bcrypt = require("bcrypt");

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, account_status)
     VALUES ($1, $2, $3, $4)`,
    [
      "Banned Test User",
      bannedEmail,
      passwordHash,
      "banned"
    ]
  );

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: bannedEmail,
      password
    });

  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "This account is not allowed to log in"
  );

  await pool.query(
    "DELETE FROM users WHERE email = $1",
    [bannedEmail]
  );
});

test("API-07: blocks deactivated users from logging in", async () => {
  const deactivatedEmail = `deactivated-${Date.now()}@example.com`;
  const password = "Password@123";
  const bcrypt = require("bcrypt");

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, account_status)
     VALUES ($1, $2, $3, $4)`,
    [
      "Deactivated Test User",
      deactivatedEmail,
      passwordHash,
      "deactivated"
    ]
  );

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: deactivatedEmail,
      password
    });

  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "This account is not allowed to log in"
  );

  await pool.query(
    "DELETE FROM users WHERE email = $1",
    [deactivatedEmail]
  );
});


  
});

describe("POST /api/auth/logout", () => {
  test("API-05: logs the user out successfully", async () => {
    const response = await request(app)
      .post("/api/auth/logout");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Logout successful");

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) =>
      cookie.startsWith("nexto_token=")
    )).toBe(true);
  });
});

test("API-07: blocks banned users from logging in", async () => {
  const bannedEmail = `banned-${Date.now()}@example.com`;
  const password = "Password@123";
  const bcrypt = require("bcrypt");

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, account_status)
     VALUES ($1, $2, $3, $4)`,
    [
      "Banned Test User",
      bannedEmail,
      passwordHash,
      "banned"
    ]
  );

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: bannedEmail,
      password
    });

  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "This account is not allowed to log in"
  );

  await pool.query(
    "DELETE FROM users WHERE email = $1",
    [bannedEmail]
  );
});
afterAll(async () => {
  await pool.end();
});