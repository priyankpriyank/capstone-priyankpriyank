const express = require("express");

const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser
} = require("../controllers/auth.controller");

const {
  authenticateToken
} = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get(
  "/me",
  authenticateToken,
  getCurrentUser
);

module.exports = router;