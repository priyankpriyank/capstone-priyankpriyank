const express = require("express");
const {
  createListing,
  getActiveListings,
  getListingDetails,
  updateListing,
  deleteListing,
  toggleListingStatus,
  getUserListings
} = require("../controllers/listing.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

// Protected user listings (Req 2.1)
router.get("/user/me", authenticateToken, getUserListings);

// Public routes (Req 4.2, 4.3: viewable by any user, logged in or not)
router.get("/", getActiveListings);
router.get("/:id", getListingDetails);

// Protected routes (Req 4.1: logged-in user can create a listing with photos)
router.post(
  "/",
  authenticateToken,
  upload.array("photos", 5),
  createListing
);

// Week 6 / Milestone 2 Management Routes:
// Edit listing (Req 4.4 - owner only)
router.put("/:id", authenticateToken, updateListing);

// Delete listing (Req 4.5 - owner only)
router.delete("/:id", authenticateToken, deleteListing);

// Mark listing as Sold / Active (Req 4.6 - owner only)
router.patch("/:id/sold", authenticateToken, toggleListingStatus);
router.patch("/:id/status", authenticateToken, toggleListingStatus);

module.exports = router;
