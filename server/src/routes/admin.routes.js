const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require("../middleware/auth.middleware");
const {
  getAllUsers,
  updateUserStatus,
  getAllListings,
  deleteListing
} = require("../controllers/admin.controller");

// All admin routes require authentication AND admin privileges (Req 1.5)
router.use(authenticateToken);
router.use(authorizeAdmin);

// User Moderation (Req 6.1, 6.2, 6.3)
router.get("/users", getAllUsers);
router.patch("/users/:userId/status", updateUserStatus);

// Listing Moderation (Req 6.4, 6.5)
router.get("/listings", getAllListings);
router.delete("/listings/:listingId", deleteListing);

module.exports = router;

