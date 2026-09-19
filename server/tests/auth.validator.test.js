const { validateRegistration } = require("../src/validators/auth.validator");

describe("Registration validation", () => {
  test("accepts a valid registration", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "test@example.com",
      password: "Password@123"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("rejects a password with 8 or fewer characters", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "test@example.com",
      password: "Pass@123"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe(
      "Password must be longer than 8 characters"
    );
  });

  test("rejects a password without an uppercase letter", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "test@example.com",
      password: "password@123"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe(
      "Password must contain at least one uppercase letter"
    );
  });

  test("rejects a password without a special character", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "test@example.com",
      password: "Password123"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe(
      "Password must contain at least one special character"
    );
  });

  test("rejects an invalid email", () => {
    const result = validateRegistration({
      fullName: "Test User",
      email: "not-an-email",
      password: "Password@123"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe(
      "Please enter a valid email address"
    );
  });
});