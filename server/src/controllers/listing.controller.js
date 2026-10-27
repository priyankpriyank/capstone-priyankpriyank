const pool = require("../config/database");
const { validateListingCreation, validateListingUpdate } = require("../validators/listing.validator");

async function createListing(req, res) {
  try {
    const userId = req.user.userId;
    const { title, description, price, categoryId } = req.body;

    // Collect photo paths from uploaded files or body
    const photoPaths = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        photoPaths.push(`/uploads/${file.filename}`);
      });
    }

    if (req.body.photos) {
      if (Array.isArray(req.body.photos)) {
        photoPaths.push(...req.body.photos);
      } else if (typeof req.body.photos === "string" && req.body.photos.trim()) {
        photoPaths.push(req.body.photos.trim());
      }
    }

    if (req.body.photoUrls) {
      if (Array.isArray(req.body.photoUrls)) {
        photoPaths.push(...req.body.photoUrls);
      } else if (typeof req.body.photoUrls === "string" && req.body.photoUrls.trim()) {
        photoPaths.push(req.body.photoUrls.trim());
      }
    }

    const validation = validateListingCreation({
      title,
      description,
      price,
      categoryId,
      photosCount: photoPaths.length
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // Check if category is active (Req 6.8 & 3.3)
    const categoryCheck = await pool.query(
      "SELECT category_id, category_name FROM categories WHERE category_id = $1 AND active = true",
      [categoryId]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The selected category is invalid or currently inactive",
        errors: { categoryId: "Invalid or inactive category" }
      });
    }

    // Insert listing record
    const listingResult = await pool.query(
      `INSERT INTO listings (owner_user_id, title, description, price, category_id, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING listing_id, owner_user_id, title, description, price, category_id, status, created_at, updated_at`,
      [userId, title.trim(), description.trim(), Number(price), categoryId]
    );

    const createdListing = listingResult.rows[0];

    // Insert photo records
    const insertedPhotos = [];
    for (const pPath of photoPaths) {
      const photoResult = await pool.query(
        `INSERT INTO listing_photos (listing_id, file_path)
         VALUES ($1, $2)
         RETURNING photo_id, listing_id, file_path, uploaded_at`,
        [createdListing.listing_id, pPath]
      );
      insertedPhotos.push(photoResult.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listing: {
        ...createdListing,
        category_name: categoryCheck.rows[0].category_name,
        photos: insertedPhotos
      }
    });
  } catch (error) {
    console.error("Create listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create listing"
    });
  }
}

async function getActiveListings(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
         l.listing_id,
         l.title,
         l.description,
         l.price,
         l.status,
         l.created_at,
         c.category_id,
         c.category_name,
         u.user_id AS owner_user_id,
         u.full_name AS seller_name,
         (
           SELECT file_path 
           FROM listing_photos lp 
           WHERE lp.listing_id = l.listing_id 
           ORDER BY photo_id ASC 
           LIMIT 1
         ) AS primary_photo
       FROM listings l
       JOIN categories c ON l.category_id = c.category_id
       JOIN users u ON l.owner_user_id = u.user_id
       WHERE l.status = 'active'
       ORDER BY l.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      listings: result.rows
    });
  } catch (error) {
    console.error("Get active listings error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve listings"
    });
  }
}

async function getListingDetails(req, res) {
  try {
    const { id } = req.params;

    const listingResult = await pool.query(
      `SELECT 
         l.listing_id,
         l.title,
         l.description,
         l.price,
         l.status,
         l.created_at,
         l.updated_at,
         c.category_id,
         c.category_name,
         u.user_id AS owner_user_id,
         u.full_name AS seller_name,
         u.email AS seller_email
       FROM listings l
       JOIN categories c ON l.category_id = c.category_id
       JOIN users u ON l.owner_user_id = u.user_id
       WHERE l.listing_id = $1`,
      [id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or does not exist"
      });
    }

    const listing = listingResult.rows[0];

    // Fetch all attached photos
    const photosResult = await pool.query(
      `SELECT photo_id, listing_id, file_path, uploaded_at
       FROM listing_photos
       WHERE listing_id = $1
       ORDER BY photo_id ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      listing: {
        ...listing,
        photos: photosResult.rows
      }
    });
  } catch (error) {
    console.error("Get listing details error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve listing details"
    });
  }
}

async function updateListing(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description, price, categoryId, status } = req.body || {};

    // Check if listing exists
    const existingResult = await pool.query(
      "SELECT listing_id, owner_user_id, status FROM listings WHERE listing_id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or does not exist"
      });
    }

    const listing = existingResult.rows[0];

    // Authorization check: only owner can edit (Req 4.4)
    if (String(listing.owner_user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to update this listing"
      });
    }

    // Validate update fields
    const validation = validateListingUpdate({ title, description, price, categoryId, status });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // If categoryId is provided, verify it is active
    if (categoryId) {
      const categoryCheck = await pool.query(
        "SELECT category_id, category_name FROM categories WHERE category_id = $1 AND active = true",
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "The selected category is invalid or inactive",
          errors: { categoryId: "Invalid or inactive category" }
        });
      }
    }

    // Execute update
    const updateResult = await pool.query(
      `UPDATE listings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           category_id = COALESCE($4, category_id),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE listing_id = $6
       RETURNING listing_id, owner_user_id, title, description, price, category_id, status, created_at, updated_at`,
      [
        title ? title.trim() : null,
        description ? description.trim() : null,
        price !== undefined ? Number(price) : null,
        categoryId || null,
        status || null,
        id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      listing: updateResult.rows[0]
    });
  } catch (error) {
    console.error("Update listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update listing"
    });
  }
}

async function deleteListing(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Check if listing exists
    const existingResult = await pool.query(
      "SELECT listing_id, owner_user_id FROM listings WHERE listing_id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or does not exist"
      });
    }

    const listing = existingResult.rows[0];

    // Authorization check: only owner can delete (Req 4.5)
    if (String(listing.owner_user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete this listing"
      });
    }

    // Clean up dependent records first
    await pool.query("DELETE FROM listing_photos WHERE listing_id = $1", [id]);
    await pool.query("DELETE FROM message_threads WHERE listing_id = $1", [id]);

    // Delete listing record
    await pool.query("DELETE FROM listings WHERE listing_id = $1", [id]);

    return res.status(200).json({
      success: true,
      message: "Listing deleted successfully"
    });
  } catch (error) {
    console.error("Delete listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete listing"
    });
  }
}

async function toggleListingStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const requestedStatus = req.body?.status;

    // Check if listing exists
    const existingResult = await pool.query(
      "SELECT listing_id, owner_user_id, status FROM listings WHERE listing_id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or does not exist"
      });
    }

    const listing = existingResult.rows[0];

    // Authorization check: only owner can change status (Req 4.6)
    if (String(listing.owner_user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to modify this listing status"
      });
    }

    // Determine target status
    let nextStatus = requestedStatus;
    if (!nextStatus) {
      nextStatus = listing.status === "active" ? "sold" : "active";
    }

    if (!["active", "sold"].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'sold'"
      });
    }

    const updateResult = await pool.query(
      `UPDATE listings
       SET status = $1, updated_at = NOW()
       WHERE listing_id = $2
       RETURNING listing_id, owner_user_id, title, status, updated_at`,
      [nextStatus, id]
    );

    return res.status(200).json({
      success: true,
      message: `Listing marked as ${nextStatus}`,
      listing: updateResult.rows[0]
    });
  } catch (error) {
    console.error("Toggle listing status error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update listing status"
    });
  }
}

async function getUserListings(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
         l.listing_id,
         l.title,
         l.description,
         l.price,
         l.status,
         l.created_at,
         l.updated_at,
         c.category_id,
         c.category_name,
         (
           SELECT file_path 
           FROM listing_photos lp 
           WHERE lp.listing_id = l.listing_id 
           ORDER BY photo_id ASC 
           LIMIT 1
         ) AS primary_photo
       FROM listings l
       JOIN categories c ON l.category_id = c.category_id
       WHERE l.owner_user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      listings: result.rows
    });
  } catch (error) {
    console.error("Get user listings error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user listings"
    });
  }
}

module.exports = {
  createListing,
  getActiveListings,
  getListingDetails,
  updateListing,
  deleteListing,
  toggleListingStatus,
  getUserListings
};
