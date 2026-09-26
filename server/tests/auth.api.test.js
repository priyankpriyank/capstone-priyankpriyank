const request = require("supertest");
const bcrypt = require("bcrypt");
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


describe("POST /api/auth/forgot-password", () => {
  const forgotEmail = `forgot-${Date.now()}@example.com`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("OldPassword@123", 12);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)`,
      ["Forgot Password User", forgotEmail, passwordHash]
    );
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [forgotEmail]
    );
  });

  test("API-06: requests a password reset successfully", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({
        email: forgotEmail
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "If an account exists, a password reset link has been requested"
    );

    // Development-only token used for testing.
    expect(response.body.resetToken).toBeDefined();
    expect(typeof response.body.resetToken).toBe("string");
  });

  test("does not reveal whether an unknown email exists", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({
        email: "does-not-exist@example.com"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "If an account exists, a password reset link has been requested"
    );

    expect(response.body.resetToken).toBeUndefined();
  });
});


describe("POST /api/auth/reset-password", () => {
  const resetEmail = `reset-${Date.now()}@example.com`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("OldPassword@123", 12);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)`,
      ["Reset Password User", resetEmail, passwordHash]
    );
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [resetEmail]
    );
  });

  test("resets the password using a valid reset token", async () => {
    // Request a reset token.
    const forgotResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({
        email: resetEmail
      });

    expect(forgotResponse.statusCode).toBe(200);

    const resetToken = forgotResponse.body.resetToken;

    expect(resetToken).toBeDefined();

    // Use the token to reset the password.
    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: resetToken,
        newPassword: "NewPassword@123"
      });

    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.body.success).toBe(true);
    expect(resetResponse.body.message).toBe(
      "Password reset successfully"
    );

    // Confirm the new password works.
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: resetEmail,
        password: "NewPassword@123"
      });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.message).toBe("Login successful");
  });

  test("rejects an invalid reset token", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: "invalid-token",
        newPassword: "NewPassword@123"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid or expired reset token"
    );
  });
});

afterAll(async () => {
  await pool.end();
});