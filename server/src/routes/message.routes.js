const express = require("express");
const {
  sendMessage,
  replyToThread,
  getInbox,
  getThreadDetails,
  getThreadForListing
} = require("../controllers/message.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

// All messaging endpoints require an authenticated user (Req 5.1–5.5)
router.use(authenticateToken);

// Send message / initiate thread on listing (Req 5.1, 5.2, 5.5)
router.post("/", sendMessage);

// Inbox: view message threads (Req 5.3)
router.get("/inbox", getInbox);
router.get("/", getInbox);

// Thread view: open thread and view messages (Req 5.4, 6.9)
router.get("/threads/:threadId", getThreadDetails);

// Reply to an active thread (Req 5.4, 5.5)
router.post("/threads/:threadId", replyToThread);

// Find existing thread for a listing (Helper for listing details page)
router.get("/listing/:listingId", getThreadForListing);

module.exports = router;
