const pool = require("../config/database");

async function getActiveCategories(req, res) {
  try {
    const result = await pool.query(
      `SELECT category_id, category_name, active
       FROM categories
       WHERE active = true
       ORDER BY category_name ASC`
    );

    return res.status(200).json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve categories"
    });
  }
}

module.exports = {
  getActiveCategories
};
