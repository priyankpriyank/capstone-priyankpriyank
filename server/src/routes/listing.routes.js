const express = require("express");
const {
  createListing,
  getActiveListings,
  getListingDetails
} = require("../controllers/listing.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

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

module.exports = router;
