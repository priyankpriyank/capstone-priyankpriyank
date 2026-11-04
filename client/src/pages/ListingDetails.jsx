import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getImageUrl } from "../services/api";
import "./ListingDetails.css";

function ListingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Week 6 Management State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    price: "",
    description: "",
    categoryId: ""
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      try {
        setLoading(true);
        setNotFound(false);
        const [listingRes, catRes] = await Promise.all([
          api.get(`/listings/${id}`),
          api.get("/categories")
        ]);

        if (listingRes.data.success) {
          const l = listingRes.data.listing;
          setListing(l);
          setEditForm({
            title: l.title,
            price: l.price,
            description: l.description,
            categoryId: l.category_id
          });
        }
        if (catRes.data.success) {
          setCategories(catRes.data.categories || []);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="details-container">
        <p>Loading listing details...</p>
      </div>
    );
  }

  // 404 Display (Desktop Mockup 7)
  if (notFound || !listing) {
    return (
      <div className="listing-404-container">
        <div className="listing-404-code">404</div>
        <h1 className="listing-404-title">Listing Not Found</h1>
        <p className="listing-404-desc">
          The listing you are looking for has been removed, marked as sold, or never existed.
        </p>
        <div className="listing-404-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Go Back
          </button>
          <Link to="/listings" className="details-action-btn">
            Browse Listings
          </Link>
        </div>
      </div>
    );
  }

  const photos = listing.photos || [];
  const activePhoto = photos[activePhotoIndex]?.file_path;
  const sellerInitial = listing.seller_name ? listing.seller_name[0].toUpperCase() : "U";
  const formattedPrice = Number(listing.price).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD"
  });

  const isOwner = user && String(user.user_id) === String(listing.owner_user_id);

  // Week 6: Toggle Listing Status (Req 4.6)
  async function handleToggleStatus() {
    setActionSuccess("");
    setActionError("");
    try {
      const res = await api.patch(`/listings/${id}/sold`);
      if (res.data.success) {
        const updatedStatus = res.data.listing.status;
        setListing((prev) => ({ ...prev, status: updatedStatus }));
        setActionSuccess(`✓ Listing marked as ${updatedStatus.toUpperCase()}`);
        setTimeout(() => setActionSuccess(""), 4000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update listing status");
    }
  }

  // Week 6: Save Edited Listing (Req 4.4)
  async function handleSaveEdit(e) {
    e.preventDefault();
    setActionSuccess("");
    setActionError("");
    setEditLoading(true);

    try {
      const res = await api.put(`/listings/${id}`, {
        title: editForm.title,
        price: editForm.price,
        description: editForm.description,
        categoryId: editForm.categoryId
      });

      if (res.data.success) {
        const updated = res.data.listing;
        const matchingCat = categories.find((c) => String(c.category_id) === String(updated.category_id));
        setListing((prev) => ({
          ...prev,
          title: updated.title,
          price: updated.price,
          description: updated.description,
          category_id: updated.category_id,
          category_name: matchingCat?.category_name || prev.category_name
        }));
        setIsEditing(false);
        setActionSuccess("✓ Listing details updated successfully!");
        setTimeout(() => setActionSuccess(""), 4000);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setActionError(Object.values(data.errors).join(" "));
      } else {
        setActionError(data?.message || "Failed to save changes.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  // Week 6: Delete Listing (Req 4.5)
  async function handleDelete() {
    setActionSuccess("");
    setActionError("");
    try {
      const res = await api.delete(`/listings/${id}`);
      if (res.data.success) {
        setShowDeleteModal(false);
        navigate("/listings");
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete listing.");
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="details-container">
      {/* Breadcrumb Navigation */}
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <Link to="/listings">Listings</Link> &gt;{" "}
        <span>{listing.category_name}</span> &gt; <span>{listing.title}</span>
      </nav>

      {/* Action Notification Banners */}
      {actionSuccess && (
        <div id="listing-action-success-msg" className="listing-alert-banner listing-alert-success" role="alert">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div id="listing-action-error-msg" className="listing-alert-banner listing-alert-error" role="alert">
          ⚠️ {actionError}
        </div>
      )}

      {/* Week 6: Owner Control Toolbar */}
      {isOwner && (
        <div className="owner-management-toolbar">
          <div className="toolbar-info">
            <span className="owner-badge-tag">👑 Owner Controls</span>
            <span className="toolbar-hint">Manage status, details, or remove this listing</span>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              id="btn-toggle-sold"
              className={`btn-toolbar ${listing.status === "active" ? "btn-mark-sold" : "btn-mark-active"}`}
              onClick={handleToggleStatus}
            >
              {listing.status === "active" ? "🏷️ Mark as Sold" : "🔄 Mark as Active"}
            </button>

            <button
              type="button"
              id="btn-edit-listing"
              className="btn-toolbar btn-edit"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel Edit" : "✏️ Edit Listing"}
            </button>

            <button
              type="button"
              id="btn-delete-listing"
              className="btn-toolbar btn-delete"
              onClick={() => setShowDeleteModal(true)}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit Form Modal/Drawer (Req 4.4) */}
      {isEditing && (
        <div className="edit-listing-box animate-fade-in">
          <div className="edit-box-header">
            <h3>Edit Listing Details (Req 4.4)</h3>
            <p>Update title, price, description, or category</p>
          </div>

          <form onSubmit={handleSaveEdit} className="listing-form">
            <div className="form-group">
              <label htmlFor="edit-listing-title" className="form-label">
                Listing Title
              </label>
              <input
                id="edit-listing-title"
                type="text"
                className="form-input"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="edit-listing-price" className="form-label">
                  Price (CAD)
                </label>
                <input
                  id="edit-listing-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-listing-category" className="form-label">
                  Category
                </label>
                <select
                  id="edit-listing-category"
                  className="form-select"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="edit-listing-description" className="form-label">
                Description
              </label>
              <textarea
                id="edit-listing-description"
                className="form-textarea"
                rows="4"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
              />
            </div>

            <div className="edit-form-buttons">
              <button
                type="submit"
                id="btn-save-edit"
                className="btn-submit-listing"
                disabled={editLoading}
              >
                {editLoading ? "Saving Changes..." : "Save Changes"}
              </button>
              <button
                type="button"
                id="btn-cancel-edit"
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal (Req 4.5) */}
      {showDeleteModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-icon-danger">🗑️</div>
            <h2 className="modal-title">Delete this listing?</h2>
            <p className="modal-desc">
              Are you sure you want to permanently delete <strong>{listing.title}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                id="btn-cancel-delete"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                className="btn-danger"
                onClick={handleDelete}
              >
                Yes, Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="details-grid">
        {/* Photo Gallery (Req 4.3) */}
        <div className="details-gallery">
          <div className="main-image-frame">
            {activePhoto ? (
              <img
                id="listing-main-photo"
                src={getImageUrl(activePhoto)}
                alt={listing.title}
                className="main-listing-img"
              />
            ) : (
              <div className="image-placeholder">📷</div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="thumbnails-row">
              {photos.map((photo, index) => (
                <button
                  key={photo.photo_id || index}
                  type="button"
                  className={`thumbnail-btn ${index === activePhotoIndex ? "active" : ""}`}
                  onClick={() => setActivePhotoIndex(index)}
                  aria-label={`View photo ${index + 1}`}
                >
                  <img
                    src={getImageUrl(photo.file_path)}
                    alt={`Thumbnail ${index + 1}`}
                    className="thumbnail-img"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listing Information Card (Req 4.3) */}
        <div className="details-info-card">
          <div className="details-badge-row">
            <span id="listing-detail-category" className="category-chip">
              {listing.category_name}
            </span>
            <span
              id="listing-detail-status"
              className={`status-chip ${
                listing.status === "active" ? "status-active" : "status-sold"
              }`}
            >
              {listing.status}
            </span>
          </div>

          <h1 id="listing-detail-title" className="details-title">
            {listing.title}
          </h1>

          <div id="listing-detail-price" className="details-price">
            {formattedPrice}
          </div>

          <div className="details-description-box">
            <h2 className="details-section-heading">Description</h2>
            <p className="details-description-text">{listing.description}</p>
          </div>

          {/* Seller Information (Req 4.3) */}
          <div className="seller-info-box">
            <div className="seller-avatar">{sellerInitial}</div>
            <div>
              <p id="listing-detail-seller" className="seller-name">
                {listing.seller_name}
              </p>
              <p className="seller-subtext">Verified Seller on NexTo</p>
            </div>
          </div>

          {/* Contact / Message Seller Button */}
          {!isOwner && (
            <div className="details-actions-container">
              <Link
                to={user ? `/messages?listingId=${listing.listing_id}` : "/login"}
                id="listing-contact-btn"
                className="details-action-btn"
              >
                💬 {user ? "Message Seller" : "Sign in to Message Seller"}
              </Link>
            </div>
          )}

          {/* Safety & Trust Box */}
          <div className="safety-tips-card">
            <div className="safety-title">
              <span>🛡️</span>
              <strong>NexTo Safe Trading Tips</strong>
            </div>
            <ul className="safety-list">
              <li>Meet in a public, well-lit place for item exchange.</li>
              <li>Inspect the item thoroughly before concluding payment.</li>
              <li>Keep all communication within NexTo messages.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetails;
