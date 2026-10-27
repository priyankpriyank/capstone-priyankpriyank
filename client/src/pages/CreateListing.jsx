import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./CreateListing.css";

function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load active categories for category picker
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get("/categories");
        if (res.data.success) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  // Handle photo file selection
  function handlePhotoChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedPhotos, ...files].slice(0, 5); // Max 5 photos
    setSelectedPhotos(newFiles);

    // Create object URLs for previews
    const newPreviews = newFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    setPreviews(newPreviews);
  }

  function handleRemovePhoto(index) {
    const updatedFiles = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(updatedFiles);

    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const title = form.get("title")?.trim();
    const description = form.get("description")?.trim();
    const price = form.get("price");
    const categoryId = form.get("categoryId");

    if (selectedPhotos.length === 0) {
      setErrorMsg("Please upload at least one listing photo.");
      return;
    }

    if (Number(price) <= 0) {
      setErrorMsg("Price must be greater than zero.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("title", title);
      data.append("description", description);
      data.append("price", price);
      data.append("categoryId", categoryId);

      selectedPhotos.forEach((file) => {
        data.append("photos", file);
      });

      const res = await api.post("/listings", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || "Listing created successfully!");
        const newId = res.data.listing?.listing_id;
        setTimeout(() => {
          navigate(newId ? `/listings/${newId}` : "/listings");
        }, 1500);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setErrorMsg(Object.values(data.errors).join(" "));
      } else {
        setErrorMsg(data?.message || "Unable to create listing. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-listing-container">
      <header className="create-listing-header">
        <h1 className="create-listing-title">Create a Listing</h1>
        <p className="create-listing-subtitle">
          Sell your items to buyers across the NexTo marketplace.
        </p>
      </header>

      <div className="create-listing-card">
        {successMsg && (
          <div
            id="listing-success-msg"
            className="listing-alert-banner listing-alert-success"
            role="alert"
          >
            ✓ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            id="listing-error-msg"
            className="listing-alert-banner listing-alert-error"
            role="alert"
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="listing-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="listing-title-input" className="form-label">
              Title
            </label>
            <input
              id="listing-title-input"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g., iPhone 13 Pro 128GB Unlocked"
              required
            />
          </div>

          {/* Category Picker (Mockup 2) */}
          <div className="form-group">
            <label htmlFor="listing-category-select" className="form-label">
              Category
            </label>
            <select
              id="listing-category-select"
              name="categoryId"
              className="form-select"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Price (Req 3.2.1: must be > 0) */}
          <div className="form-group">
            <label htmlFor="listing-price-input" className="form-label">
              Price (CAD)
            </label>
            <div className="price-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                id="listing-price-input"
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input price-input"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="listing-description-input" className="form-label">
              Description
            </label>
            <textarea
              id="listing-description-input"
              name="description"
              className="form-textarea"
              placeholder="Describe the condition, features, and reason for selling..."
              required
            />
          </div>

          {/* Photo Upload (Req 4.1.2) */}
          <div className="form-group">
            <label className="form-label">Photos (At least 1 required)</label>
            <div
              className="photo-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="photo-upload-icon">📷</div>
              <p className="photo-upload-text">
                Click to upload photos (or drag & drop)
              </p>
              <p className="photo-upload-subtext">
                PNG, JPG, WEBP up to 5MB each (Max 5 photos)
              </p>
              <input
                ref={fileInputRef}
                id="listing-photos-input"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>

            {previews.length > 0 && (
              <div className="photo-previews-grid">
                {previews.map((preview, index) => (
                  <div key={index} className="photo-preview-item">
                    <img
                      src={preview.url}
                      alt={`Upload preview ${index + 1}`}
                      className="photo-preview-img"
                    />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => handleRemovePhoto(index)}
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="listing-submit-btn"
            className="btn-submit-listing"
            disabled={loading}
          >
            {loading ? "Posting Listing..." : "Post Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateListing;