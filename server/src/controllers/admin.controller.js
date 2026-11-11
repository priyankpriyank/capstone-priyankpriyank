const pool = require("../config/database");

/**
 * Controller: Admin Moderation
 * Covers Requirements:
 * - 6.1: View all user accounts
 * - 6.2: Deactivate a user account
 * - 6.3: Ban a user account
 * - 6.4: View all listings
 * - 6.5: Delete any listing
 * - 1.5: Role-based admin access control
 */

/**
 * GET /api/admin/users
 * Requirement 6.1: Allow admin to view all user accounts
 */
async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
         u.user_id,
         u.full_name,
         u.email,
         u.role,
         u.account_status,
         u.created_at,
         COUNT(l.listing_id)::int AS listings_count
       FROM users u
       LEFT JOIN listings l ON l.owner_user_id = u.user_id
       GROUP BY u.user_id, u.full_name, u.email, u.role, u.account_status, u.created_at
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error("Admin getAllUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve users"
    });
  }
}

/**
 * PATCH /api/admin/users/:userId/status
 * Requirement 6.2: Deactivate user account
 * Requirement 6.3: Ban user account
 */
async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ["active", "deactivated", "banned"];
  if (!status || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    });
  }

  const targetStatus = status.toLowerCase();

  // Safety: Admin cannot ban or deactivate their own account
  if (Number(req.user.userId) === Number(userId) && targetStatus !== "active") {
    return res.status(400).json({
      success: false,
      message: "Administrators cannot deactivate or ban their own account"
    });
  }

  try {
    const checkResult = await pool.query(
      "SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = $1",
      [userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET account_status = $1
       WHERE user_id = $2
       RETURNING user_id, full_name, email, role, account_status`,
      [targetStatus, userId]
    );

    return res.status(200).json({
      success: true,
      message: `User account status updated to ${targetStatus}`,
      user: updatedResult.rows[0]
    });
  } catch (error) {
    console.error("Admin updateUserStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update user status"
    });
  }
}

/**
 * GET /api/admin/listings
 * Requirement 6.4: Allow admin to view all listings
 */
async function getAllListings(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
         l.listing_id,
         l.owner_user_id,
         l.title,
         l.description,
         l.price,
         l.status,
         l.category_id,
         c.category_name,
         u.full_name AS owner_name,
         u.email AS owner_email,
         l.created_at,
         (
           SELECT file_path 
           FROM listing_photos lp 
           WHERE lp.listing_id = l.listing_id 
           ORDER BY lp.photo_id ASC 
           LIMIT 1
         ) AS primary_photo
       FROM listings l
       LEFT JOIN categories c ON l.category_id = c.category_id
       LEFT JOIN users u ON l.owner_user_id = u.user_id
       ORDER BY l.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      listings: result.rows
    });
  } catch (error) {
    console.error("Admin getAllListings error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve listings"
    });
  }
}

/**
 * DELETE /api/admin/listings/:listingId
 * Requirement 6.5: Allow admin to delete any listing
 */
async function deleteListing(req, res) {
  const { listingId } = req.params;

  try {
    const checkResult = await pool.query(
      "SELECT listing_id, title FROM listings WHERE listing_id = $1",
      [listingId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }

    // Clean up dependent child records safely
    await pool.query(
      "DELETE FROM messages WHERE thread_id IN (SELECT thread_id FROM message_threads WHERE listing_id = $1)",
      [listingId]
    );
    await pool.query(
      "DELETE FROM message_threads WHERE listing_id = $1",
      [listingId]
    );
    await pool.query(
      "DELETE FROM listing_photos WHERE listing_id = $1",
      [listingId]
    );
    await pool.query(
      "DELETE FROM listings WHERE listing_id = $1",
      [listingId]
    );

    return res.status(200).json({
      success: true,
      message: "Listing deleted successfully by administrator"
    });
  } catch (error) {
    console.error("Admin deleteListing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete listing"
    });
  }
}

module.exports = {
  getAllUsers,
  updateUserStatus,
  getAllListings,
  deleteListing
};

