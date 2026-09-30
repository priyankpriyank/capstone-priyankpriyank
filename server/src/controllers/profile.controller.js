const pool = require("../config/database");
const bcrypt = require("bcrypt");
const {
  validateProfileUpdate,
  validatePasswordChange
} = require("../validators/profile.validator");

async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      `SELECT user_id, full_name, email, role, account_status, created_at
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    const user = userResult.rows[0];

    // Fetch listing statistics for Desktop Mockup 6
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_listings,
         COUNT(*) FILTER (WHERE status = 'sold')::int AS sold_listings,
         COUNT(*)::int AS total_listings
       FROM listings
       WHERE owner_user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0] || {
      active_listings: 0,
      sold_listings: 0,
      total_listings: 0
    };

    return res.status(200).json({
      success: true,
      profile: {
        ...user,
        stats
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile information"
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { fullName, email } = req.body;

    const validation = validateProfileUpdate({ fullName, email });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if another account already uses this email
    const duplicateCheck = await pool.query(
      "SELECT user_id FROM users WHERE LOWER(email) = $1 AND user_id != $2",
      [normalizedEmail, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const updateResult = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2
       WHERE user_id = $3
       RETURNING user_id, full_name, email, role, account_status, created_at`,
      [normalizedName, normalizedEmail, userId]
    );

    const updatedUser = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile"
    });
  }
}

async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const validation = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // Retrieve current password hash
    const userResult = await pool.query(
      "SELECT password_hash FROM users WHERE user_id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found"
      });
    }

    const storedHash = userResult.rows[0].password_hash;
    const isCurrentValid = await bcrypt.compare(currentPassword, storedHash);

    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE user_id = $2",
      [newHash, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change password"
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
