const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword
} = require("../controllers/profile.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

// All profile endpoints require authentication (Req 2.1 - 2.3)
router.use(authenticateToken);

router.get("/", getProfile);
router.put("/", updateProfile);
router.put("/change-password", changePassword);

module.exports = router;
