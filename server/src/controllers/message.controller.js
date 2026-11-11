const pool = require("../config/database");
const { validateSendMessage, validateReplyMessage } = require("../validators/message.validator");
const { encryptMessage, decryptMessage } = require("../services/messageEncryption.service");

/**
 * Send a message on a listing (Req 5.1, 5.2, 5.5)
 * Creates a new thread or reuses existing thread between buyer & seller for this listing.
 */
async function sendMessage(req, res) {
  try {
    const buyerUserId = req.user.userId;
    const { listingId } = req.body;
    const content = req.body.content || req.body.message;

    // 1. Validate payload
    const validation = validateSendMessage({ listingId, content });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // 2. Fetch target listing
    const listingRes = await pool.query(
      `SELECT listing_id, owner_user_id, title, price, status
       FROM listings
       WHERE listing_id = $1`,
      [listingId]
    );

    if (listingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or does not exist"
      });
    }

    const listing = listingRes.rows[0];
    const sellerUserId = listing.owner_user_id;

    // 3. User cannot message themselves on their own listing
    if (String(sellerUserId) === String(buyerUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot message yourself about your own listing"
      });
    }

    // 4. Thread Reuse Logic (Req 5.2):
    // Check if a thread already exists between this buyer and seller for this listing
    let threadId;
    const existingThread = await pool.query(
      `SELECT thread_id, listing_id, buyer_user_id, seller_user_id, created_at
       FROM message_threads
       WHERE listing_id = $1 AND buyer_user_id = $2 AND seller_user_id = $3`,
      [listingId, buyerUserId, sellerUserId]
    );

    if (existingThread.rows.length > 0) {
      // Reuse existing thread
      threadId = existingThread.rows[0].thread_id;
    } else {
      // Create new thread
      const newThreadRes = await pool.query(
        `INSERT INTO message_threads (listing_id, buyer_user_id, seller_user_id, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING thread_id, listing_id, buyer_user_id, seller_user_id, created_at`,
        [listingId, buyerUserId, sellerUserId]
      );
      threadId = newThreadRes.rows[0].thread_id;
    }

    // 5. Encrypt message and store in database (Req 5.5, NF 2.2)
    const encrypted = encryptMessage(content.trim());

    const messageRes = await pool.query(
      `INSERT INTO messages (thread_id, sender_user_id, encrypted_content, sent_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING message_id, thread_id, sender_user_id, sent_at`,
      [threadId, buyerUserId, encrypted]
    );

    const createdMsg = messageRes.rows[0];

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      threadId,
      messageRecord: {
        message_id: createdMsg.message_id,
        thread_id: createdMsg.thread_id,
        sender_user_id: createdMsg.sender_user_id,
        content: content.trim(),
        sent_at: createdMsg.sent_at
      }
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send message"
    });
  }
}

/**
 * Reply to an existing thread (Req 5.4, 5.5)
 */
async function replyToThread(req, res) {
  try {
    const senderUserId = req.user.userId;
    const { threadId } = req.params;
    const content = req.body.content || req.body.message;

    // 1. Validate payload
    const validation = validateReplyMessage({ content });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // 2. Fetch thread
    const threadRes = await pool.query(
      `SELECT thread_id, listing_id, buyer_user_id, seller_user_id
       FROM message_threads
       WHERE thread_id = $1`,
      [threadId]
    );

    if (threadRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation thread not found or does not exist"
      });
    }

    const thread = threadRes.rows[0];

    // 3. Authorization check (Req 6.9): Only buyer or seller may participate
    const isParticipant =
      String(thread.buyer_user_id) === String(senderUserId) ||
      String(thread.seller_user_id) === String(senderUserId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to participate in this message thread"
      });
    }

    // 4. Encrypt and insert message (Req 5.5)
    const encrypted = encryptMessage(content.trim());

    const messageRes = await pool.query(
      `INSERT INTO messages (thread_id, sender_user_id, encrypted_content, sent_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING message_id, thread_id, sender_user_id, sent_at`,
      [threadId, senderUserId, encrypted]
    );

    const createdMsg = messageRes.rows[0];

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully",
      threadId: thread.thread_id,
      messageRecord: {
        message_id: createdMsg.message_id,
        thread_id: createdMsg.thread_id,
        sender_user_id: createdMsg.sender_user_id,
        content: content.trim(),
        sent_at: createdMsg.sent_at
      }
    });
  } catch (error) {
    console.error("Reply to thread error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send reply"
    });
  }
}

/**
 * Get user inbox threads (Req 5.3, Desktop Mockup 3)
 */
async function getInbox(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
         mt.thread_id,
         mt.listing_id,
         mt.buyer_user_id,
         mt.seller_user_id,
         mt.created_at AS thread_created_at,
         l.title AS listing_title,
         l.price AS listing_price,
         l.status AS listing_status,
         (
           SELECT file_path 
           FROM listing_photos lp 
           WHERE lp.listing_id = l.listing_id 
           ORDER BY photo_id ASC 
           LIMIT 1
         ) AS listing_photo,
         buyer.full_name AS buyer_name,
         buyer.email AS buyer_email,
         seller.full_name AS seller_name,
         seller.email AS seller_email,
         m.message_id AS last_message_id,
         m.sender_user_id AS last_sender_id,
         m.encrypted_content AS last_message_raw,
         m.sent_at AS last_message_at
       FROM message_threads mt
       JOIN listings l ON mt.listing_id = l.listing_id
       JOIN users buyer ON mt.buyer_user_id = buyer.user_id
       JOIN users seller ON mt.seller_user_id = seller.user_id
       LEFT JOIN LATERAL (
         SELECT message_id, sender_user_id, encrypted_content, sent_at
         FROM messages
         WHERE thread_id = mt.thread_id
         ORDER BY sent_at DESC, message_id DESC
         LIMIT 1
       ) m ON true
       WHERE mt.buyer_user_id = $1 OR mt.seller_user_id = $1
       ORDER BY COALESCE(m.sent_at, mt.created_at) DESC`,
      [userId]
    );

    const formattedThreads = result.rows.map((row) => {
      const isBuyer = String(row.buyer_user_id) === String(userId);
      const otherUser = isBuyer
        ? {
            user_id: row.seller_user_id,
            full_name: row.seller_name,
            email: row.seller_email,
            role: "Seller"
          }
        : {
            user_id: row.buyer_user_id,
            full_name: row.buyer_name,
            email: row.buyer_email,
            role: "Buyer"
          };

      const lastMessageText = row.last_message_raw
        ? decryptMessage(row.last_message_raw)
        : "";

      return {
        thread_id: row.thread_id,
        listing: {
          listing_id: row.listing_id,
          title: row.listing_title,
          price: row.listing_price,
          status: row.listing_status,
          primary_photo: row.listing_photo
        },
        other_user: otherUser,
        is_buyer: isBuyer,
        last_message: lastMessageText
          ? {
              message_id: row.last_message_id,
              sender_user_id: row.last_sender_id,
              text: lastMessageText,
              sent_at: row.last_message_at,
              is_mine: String(row.last_sender_id) === String(userId)
            }
          : null,
        created_at: row.thread_created_at
      };
    });

    return res.status(200).json({
      success: true,
      threads: formattedThreads
    });
  } catch (error) {
    console.error("Get inbox error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve inbox messages"
    });
  }
}

/**
 * Get full thread conversation & messages (Req 5.4, 6.9)
 */
async function getThreadDetails(req, res) {
  try {
    const userId = req.user.userId;
    const { threadId } = req.params;

    // 1. Fetch thread info
    const threadRes = await pool.query(
      `SELECT 
         mt.thread_id,
         mt.listing_id,
         mt.buyer_user_id,
         mt.seller_user_id,
         mt.created_at AS thread_created_at,
         l.title AS listing_title,
         l.price AS listing_price,
         l.status AS listing_status,
         l.owner_user_id AS listing_owner_id,
         (
           SELECT file_path 
           FROM listing_photos lp 
           WHERE lp.listing_id = l.listing_id 
           ORDER BY photo_id ASC 
           LIMIT 1
         ) AS listing_photo,
         buyer.full_name AS buyer_name,
         buyer.email AS buyer_email,
         seller.full_name AS seller_name,
         seller.email AS seller_email
       FROM message_threads mt
       JOIN listings l ON mt.listing_id = l.listing_id
       JOIN users buyer ON mt.buyer_user_id = buyer.user_id
       JOIN users seller ON mt.seller_user_id = seller.user_id
       WHERE mt.thread_id = $1`,
      [threadId]
    );

    if (threadRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message thread not found or does not exist"
      });
    }

    const row = threadRes.rows[0];

    // 2. Strict Authorization Check (Req 6.9):
    // Only the buyer or seller of the thread can access its contents!
    const isParticipant =
      String(row.buyer_user_id) === String(userId) ||
      String(row.seller_user_id) === String(userId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this private message thread"
      });
    }

    // 3. Fetch all messages in chronological order (Req 5.4)
    const messagesRes = await pool.query(
      `SELECT 
         m.message_id,
         m.thread_id,
         m.sender_user_id,
         m.encrypted_content,
         m.sent_at,
         u.full_name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_user_id = u.user_id
       WHERE m.thread_id = $1
       ORDER BY m.sent_at ASC, m.message_id ASC`,
      [threadId]
    );

    const decryptedMessages = messagesRes.rows.map((m) => ({
      message_id: m.message_id,
      thread_id: m.thread_id,
      sender_user_id: m.sender_user_id,
      sender_name: m.sender_name,
      text: decryptMessage(m.encrypted_content),
      sent_at: m.sent_at,
      is_mine: String(m.sender_user_id) === String(userId)
    }));

    const isBuyer = String(row.buyer_user_id) === String(userId);
    const otherUser = isBuyer
      ? {
          user_id: row.seller_user_id,
          full_name: row.seller_name,
          email: row.seller_email,
          role: "Seller"
        }
      : {
          user_id: row.buyer_user_id,
          full_name: row.buyer_name,
          email: row.buyer_email,
          role: "Buyer"
        };

    return res.status(200).json({
      success: true,
      thread: {
        thread_id: row.thread_id,
        listing: {
          listing_id: row.listing_id,
          title: row.listing_title,
          price: row.listing_price,
          status: row.listing_status,
          primary_photo: row.listing_photo
        },
        other_user: otherUser,
        is_buyer: isBuyer,
        created_at: row.thread_created_at
      },
      messages: decryptedMessages
    });
  } catch (error) {
    console.error("Get thread details error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve conversation messages"
    });
  }
}

/**
 * Check if a thread already exists for a listing (Helper for UI)
 */
async function getThreadForListing(req, res) {
  try {
    const buyerUserId = req.user.userId;
    const { listingId } = req.params;

    const threadRes = await pool.query(
      `SELECT thread_id
       FROM message_threads
       WHERE listing_id = $1 AND (buyer_user_id = $2 OR seller_user_id = $2)
       LIMIT 1`,
      [listingId, buyerUserId]
    );

    if (threadRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        exists: false,
        threadId: null
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      threadId: threadRes.rows[0].thread_id
    });
  } catch (error) {
    console.error("Get thread for listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check listing thread status"
    });
  }
}

module.exports = {
  sendMessage,
  replyToThread,
  getInbox,
  getThreadDetails,
  getThreadForListing
};
