const bcrypt = require("bcrypt");
const pool = require("./database");

/**
 * Ensures a default system administrator exists in the database.
 * Credentials:
 *   Email: admin@nexto.com
 *   Password: P@ssw0rd1!
 */
async function ensureAdminUser() {
  try {
    const res = await pool.query(
      "SELECT user_id, email, role FROM users WHERE email = $1",
      ["admin@nexto.com"]
    );

    if (res.rows.length === 0) {
      const hash = await bcrypt.hash("P@ssw0rd1!", 12);
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, account_status)
         VALUES ('NexTo Administrator', 'admin@nexto.com', $1, 'Admin', 'active')`,
        [hash]
      );
      console.log("Seed: Created default admin account: admin@nexto.com / P@ssw0rd1!");
    }
  } catch (err) {
    console.error("Admin seed error:", err.message);
  }
}

module.exports = { ensureAdminUser };
