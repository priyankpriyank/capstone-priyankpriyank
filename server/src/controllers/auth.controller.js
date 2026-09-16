const pool = require("../config/database");
const bcrypt = require("bcrypt");
const { validateRegistration } = require("../validators/auth.validator");

async function register(req, res) {
  try {
    const { fullName, email, password } = req.body;

    // Validate input
    const validation = validateRegistration({
      fullName,
      email,
      password
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    // Check for existing email
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, full_name, email, role, account_status, created_at`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account"
    });
  }
}

module.exports = {
  register
};