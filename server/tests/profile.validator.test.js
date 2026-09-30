const {
  validateProfileUpdate,
  validatePasswordChange
} = require("../src/validators/profile.validator");

describe("Profile Validator - validateProfileUpdate", () => {
  test("UT-P01: passes validation with valid fullName and email", () => {
    const result = validateProfileUpdate({
      fullName: "Jane Doe",
      email: "jane@example.com"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("UT-P02: fails when fullName is missing or empty", () => {
    const result = validateProfileUpdate({
      fullName: "   ",
      email: "jane@example.com"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.fullName).toBe("Full name is required");
  });

  test("UT-P03: fails when email is missing or empty", () => {
    const result = validateProfileUpdate({
      fullName: "Jane Doe",
      email: ""
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe("Email is required");
  });

  test("UT-P04: fails when email format is invalid", () => {
    const result = validateProfileUpdate({
      fullName: "Jane Doe",
      email: "not-an-email"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe("Please enter a valid email address");
  });
});

describe("Profile Validator - validatePasswordChange", () => {
  test("UT-P05: passes with valid current and new password satisfying req 1.1.2", () => {
    const result = validatePasswordChange({
      currentPassword: "OldPassword1!",
      newPassword: "NewP@ssword2#",
      confirmPassword: "NewP@ssword2#"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("UT-P06: fails when current password is missing", () => {
    const result = validatePasswordChange({
      currentPassword: "",
      newPassword: "NewP@ssword2#",
      confirmPassword: "NewP@ssword2#"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.currentPassword).toBe("Current password is required");
  });

  test("UT-P07: fails when new password is 8 characters or fewer (UT-02)", () => {
    const result = validatePasswordChange({
      currentPassword: "OldPassword1!",
      newPassword: "Pass1!"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.newPassword).toBe("Password must be longer than 8 characters");
  });

  test("UT-P08: fails when new password lacks uppercase letter", () => {
    const result = validatePasswordChange({
      currentPassword: "OldPassword1!",
      newPassword: "password123!"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.newPassword).toBe("Password must contain at least one uppercase letter");
  });

  test("UT-P09: fails when new password lacks special character", () => {
    const result = validatePasswordChange({
      currentPassword: "OldPassword1!",
      newPassword: "Password1234"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.newPassword).toBe("Password must contain at least one special character");
  });

  test("UT-P10: fails when confirmPassword does not match newPassword", () => {
    const result = validatePasswordChange({
      currentPassword: "OldPassword1!",
      newPassword: "NewP@ssword2#",
      confirmPassword: "DifferentPassword2#"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBe("Passwords do not match");
  });
});
