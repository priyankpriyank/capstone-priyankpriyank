import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Listings.css";

function Listings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Sort state (Desktop Mockup 5 & Req 7.1-7.3)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [listingsRes, categoriesRes] = await Promise.all([
          api.get("/listings"),
          api.get("/categories")
        ]);

        if (listingsRes.data.success) {
          setListings(listingsRes.data.listings || []);
        }
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load listings data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter and Sort in real-time
  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        // Search by title (Req 7.1)
        const matchesQuery = item.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim());

        // Filter by category (Req 7.2)
        const matchesCategory =
          selectedCategory === "all" ||
          String(item.category_id) === String(selectedCategory);

        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        // Sort by price or date (Req 7.3)
        if (sortBy === "price_asc") {
          return Number(a.price) - Number(b.price);
        }
        if (sortBy === "price_desc") {
          return Number(b.price) - Number(a.price);
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at) - new Date(b.created_at);
        }
        // default: newest
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [listings, searchQuery, selectedCategory, sortBy]);

  function getImageUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `http://localhost:5000${path}`;
  }

  return (
    <div className="listings-page-container">
      <header className="listings-header">
        <h1 className="listings-title">Browse Marketplace Listings</h1>
        <p className="listings-subtitle">
          Find electronics, clothing, home goods, and more from verified community sellers.
        </p>
      </header>

      {/* Desktop Mockup 5: Search, Filter Chips & Sort Controls */}
      <section className="controls-panel" aria-label="Search and filter listings">
        <div className="search-and-sort-row">
          {/* Search by title (Req 7.1) */}
          <div className="search-box-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="listings-search-input"
              type="text"
              placeholder="Search listings by title (e.g., iPhone, Laptop, Jacket)..."
              className="listings-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort dropdown (Req 7.3) */}
          <div className="sort-wrapper">
            <label htmlFor="listings-sort-select" className="sort-label">
              Sort By:
            </label>
            <select
              id="listings-sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips (Req 7.2) */}
        <div className="category-chips-row" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            className={`category-chip-btn ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              type="button"
              className={`category-chip-btn ${
                String(selectedCategory) === String(cat.category_id) ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(String(cat.category_id))}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </section>

      {/* Results Count Summary */}
      <div className="results-summary-bar">
        <span>
          Showing <strong>{filteredListings.length}</strong> active listing
          {filteredListings.length === 1 ? "" : "s"}
        </span>
        {(searchQuery || selectedCategory !== "all") && (
          <button
            type="button"
            className="filter-clear-link"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          >
            Clear active filters ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="listings-loading-state">
          <div className="spinner-mini" />
          <p>Loading marketplace listings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="listings-empty-state">
          <div className="empty-state-icon">🔍</div>
          <h2>No matching listings found</h2>
          <p>We couldn't find anything matching your current filters. Try searching with different keywords or resetting filters.</p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* 4-Column Card Grid (Desktop Mockup 5) */
        <div className="listings-grid">
          {filteredListings.map((item) => (
            <Link
              key={item.listing_id}
              to={`/listings/${item.listing_id}`}
              className="listing-card"
            >
              <div className="card-image-box">
                {item.primary_photo ? (
                  <img
                    src={getImageUrl(item.primary_photo)}
                    alt={item.title}
                    className="card-img"
                  />
                ) : (
                  <div className="card-placeholder">📷</div>
                )}
                <span className="card-category-badge">{item.category_name}</span>
                {item.status === "sold" && (
                  <span className="card-sold-badge">SOLD</span>
                )}
              </div>

              <div className="card-body">
                <h2 className="card-title">{item.title}</h2>
                <p className="card-desc-snippet">{item.description}</p>

                <div className="card-footer">
                  <span className="card-price">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <span className="card-seller">by {item.seller_name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Listings;