const pool = require("../config/database");
const bcrypt = require("bcrypt");
const { validateRegistration } = require("../validators/auth.validator");

const {
  createResetToken,
  getResetToken,
  deleteResetToken
} = require("../services/passwordReset.service");

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

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT user_id, full_name, email, password_hash, role, account_status
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    // Block banned and deactivated accounts
    if (
      user.account_status === "banned" ||
      user.account_status === "deactivated"
    ) {
      return res.status(403).json({
        success: false,
        message: "This account is not allowed to log in"
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = require("jsonwebtoken").sign(
      {
        userId: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    res.cookie("nexto_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        account_status: user.account_status
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
}

async function logout(req, res) {
  try {
    res.clearCookie("nexto_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log out"
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT user_id, email
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    // Do not reveal whether an email exists.
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a password reset link has been requested"
      });
    }

    const user = result.rows[0];

    const token = createResetToken(user.user_id);

    // Temporary development output.
    // We will replace this with email delivery later.
    console.log(
      `Password reset token for ${user.email}: ${token}`
    );

    return res.status(200).json({
      success: true,
      message: "If an account exists, a password reset link has been requested",
      resetToken: token
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request"
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required"
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required"
      });
    }

    // Validate the new password using the same registration rules
    const validation = validateRegistration({
      fullName: "Password Reset",
      email: "reset@example.com",
      password: newPassword
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid new password",
        errors: {
          password: validation.errors.password
        }
      });
    }

    const resetData = getResetToken(token);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE user_id = $2`,
      [passwordHash, resetData.userId]
    );

    // Make the token unusable after successful reset
    deleteResetToken(token);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password"
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword
};
