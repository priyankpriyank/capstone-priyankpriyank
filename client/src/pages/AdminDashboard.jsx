import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getImageUrl } from "../services/api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const { user: currentAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [listingSearch, setListingSearch] = useState("");

  // Feedback alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal for listing deletion confirmation
  const [deleteModalListing, setDeleteModalListing] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    setErrorMsg("");
    try {
      const [usersRes, listingsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/listings")
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.users || []);
      }
      if (listingsRes.data.success) {
        setListings(listingsRes.data.listings || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setErrorMsg("Failed to load administration data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Handle user account status updates (Req 6.2, 6.3)
  async function handleStatusChange(userId, newStatus) {
    setErrorMsg("");
    setSuccessMsg("");
    setProcessingAction(true);

    try {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        status: newStatus
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || `User status changed to ${newStatus}`);
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === userId ? { ...u, account_status: newStatus } : u
          )
        );
      }
    } catch (err) {
      console.error("Status update error:", err);
      setErrorMsg(
        err.response?.data?.message || "Failed to update user account status"
      );
    } finally {
      setProcessingAction(false);
    }
  }

  // Handle listing deletion (Req 6.5)
  async function confirmDeleteListing() {
    if (!deleteModalListing) return;
    const targetId = deleteModalListing.listing_id;

    setErrorMsg("");
    setSuccessMsg("");
    setProcessingAction(true);

    try {
      const res = await api.delete(`/admin/listings/${targetId}`);
      if (res.data.success) {
        setSuccessMsg(
          `Listing #${targetId} ("${deleteModalListing.title}") was successfully removed by administrator.`
        );
        setListings((prev) => prev.filter((l) => l.listing_id !== targetId));
        setDeleteModalListing(null);
      }
    } catch (err) {
      console.error("Listing delete error:", err);
      setErrorMsg(
        err.response?.data?.message || "Failed to delete listing"
      );
    } finally {
      setProcessingAction(false);
    }
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.user_id).includes(userSearch);
    const matchesStatus =
      userStatusFilter === "all" || u.account_status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered listings
  const filteredListings = listings.filter((l) => {
    return (
      l.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.owner_name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.owner_email?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.category_name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      String(l.listing_id).includes(listingSearch)
    );
  });

  // Summary counts
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.account_status === "active").length;
  const flaggedUsers = users.filter(
    (u) => u.account_status === "deactivated" || u.account_status === "banned"
  ).length;
  const totalListings = listings.length;

  return (
    <div id="admin-dashboard-container" className="admin-page-container">
      {/* Header section */}
      <header className="admin-header-section">
        <div className="admin-title-row">
          <span className="admin-shield-icon">🛡️</span>
          <div>
            <h1 className="admin-page-title">Administrator Moderation Panel</h1>
            <p className="admin-page-subtitle">
              Manage community member accounts, review active listings, and ensure platform safety.
            </p>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Users</span>
            <span id="stat-total-users" className="admin-stat-value">
              {totalUsers}
            </span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Active Users</span>
            <span id="stat-active-users" className="admin-stat-value stat-active">
              {activeUsers}
            </span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Flagged / Inactive</span>
            <span id="stat-flagged-users" className="admin-stat-value stat-flagged">
              {flaggedUsers}
            </span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Listings</span>
            <span id="stat-total-listings" className="admin-stat-value stat-listings">
              {totalListings}
            </span>
          </div>
        </div>
      </header>

      {/* Global Alerts */}
      {successMsg && (
        <div id="admin-action-success-msg" className="admin-alert admin-alert-success" role="alert">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div id="admin-action-error-msg" className="admin-alert admin-alert-error" role="alert">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="admin-tabs-nav" role="tablist">
        <button
          id="tab-btn-users"
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("users");
            setSuccessMsg("");
            setErrorMsg("");
          }}
        >
          👤 User Accounts ({users.length})
        </button>
        <button
          id="tab-btn-listings"
          type="button"
          role="tab"
          aria-selected={activeTab === "listings"}
          className={`admin-tab-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("listings");
            setSuccessMsg("");
            setErrorMsg("");
          }}
        >
          📦 Marketplace Listings ({listings.length})
        </button>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-mini" />
          <p>Loading moderation data...</p>
        </div>
      ) : activeTab === "users" ? (
        /* ================= USER MODERATION SECTION (Req 6.1, 6.2, 6.3) ================= */
        <section className="admin-section" aria-label="User Accounts Moderation">
          <div className="admin-controls-bar">
            <div className="admin-search-box">
              <span className="search-icon">🔍</span>
              <input
                id="admin-user-search-input"
                type="text"
                placeholder="Search users by name, email, or ID..."
                className="admin-input"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="admin-filter-group">
              <label htmlFor="admin-user-status-filter" className="admin-filter-label">
                Status:
              </label>
              <select
                id="admin-user-status-filter"
                className="admin-select"
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
                <option value="banned">Banned Only</option>
              </select>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table" aria-label="User accounts table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Listings</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      No user accounts match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = Number(u.user_id) === Number(currentAdmin?.user_id);
                    return (
                      <tr key={u.user_id} id={`user-row-${u.user_id}`}>
                        <td>
                          <div className="user-cell">
                            <span className="user-cell-name">{u.full_name}</span>
                            <span className="user-cell-email">{u.email}</span>
                            <span className="user-cell-id">ID: #{u.user_id}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`role-badge ${
                              u.role?.toLowerCase() === "admin"
                                ? "role-admin"
                                : "role-user"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className="listings-count-badge">
                            {u.listings_count || 0} items
                          </span>
                        </td>
                        <td>
                          <span className="date-cell">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </td>
                        <td>
                          <span
                            id={`user-status-${u.user_id}`}
                            className={`status-pill status-${u.account_status}`}
                          >
                            {u.account_status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isSelf ? (
                            <span className="admin-self-notice">(Current User)</span>
                          ) : (
                            <div className="action-buttons-group">
                              {/* Req 6.2: Deactivate user */}
                              {u.account_status !== "deactivated" && (
                                <button
                                  id={`btn-deactivate-${u.user_id}`}
                                  type="button"
                                  className="btn-action btn-action-deactivate"
                                  disabled={processingAction}
                                  onClick={() => handleStatusChange(u.user_id, "deactivated")}
                                  title="Deactivate this user account"
                                >
                                  Deactivate
                                </button>
                              )}

                              {/* Req 6.3: Ban user */}
                              {u.account_status !== "banned" && (
                                <button
                                  id={`btn-ban-${u.user_id}`}
                                  type="button"
                                  className="btn-action btn-action-ban"
                                  disabled={processingAction}
                                  onClick={() => handleStatusChange(u.user_id, "banned")}
                                  title="Ban this user from the marketplace"
                                >
                                  Ban User
                                </button>
                              )}

                              {/* Reactivate */}
                              {u.account_status !== "active" && (
                                <button
                                  id={`btn-reactivate-${u.user_id}`}
                                  type="button"
                                  className="btn-action btn-action-reactivate"
                                  disabled={processingAction}
                                  onClick={() => handleStatusChange(u.user_id, "active")}
                                  title="Reactivate this user account"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* ================= LISTING MODERATION SECTION (Req 6.4, 6.5) ================= */
        <section className="admin-section" aria-label="Listing Moderation">
          <div className="admin-controls-bar">
            <div className="admin-search-box">
              <span className="search-icon">🔍</span>
              <input
                id="admin-listing-search-input"
                type="text"
                placeholder="Search listings by title, seller, or category..."
                className="admin-input"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
              />
            </div>
            <div className="admin-results-summary">
              Showing <strong>{filteredListings.length}</strong> of {listings.length} listings
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table" aria-label="Marketplace listings table">
              <thead>
                <tr>
                  <th scope="col">Listing Item</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Seller</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      No marketplace listings found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((l) => (
                    <tr key={l.listing_id} id={`admin-listing-row-${l.listing_id}`}>
                      <td>
                        <div className="listing-item-cell">
                          {l.primary_photo ? (
                            <img
                              src={getImageUrl(l.primary_photo)}
                              alt={l.title}
                              className="listing-thumb-img"
                            />
                          ) : (
                            <div className="listing-thumb-placeholder">📷</div>
                          )}
                          <div className="listing-item-info">
                            <Link
                              to={`/listings/${l.listing_id}`}
                              className="listing-item-title-link"
                              id={`admin-listing-title-${l.listing_id}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View listing details in new tab"
                            >
                              {l.title} ↗
                            </Link>
                            <span className="listing-item-id">ID: #{l.listing_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{l.category_name || "General"}</span>
                      </td>
                      <td>
                        <span className="price-tag">${Number(l.price).toFixed(2)}</span>
                      </td>
                      <td>
                        <div className="seller-cell">
                          <span className="seller-name">{l.owner_name}</span>
                          <span className="seller-email">{l.owner_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${l.status}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {/* Req 6.5: Admin delete any listing */}
                        <button
                          id={`btn-admin-delete-${l.listing_id}`}
                          type="button"
                          className="btn-action btn-action-delete"
                          onClick={() => setDeleteModalListing(l)}
                          title="Delete this listing as administrator"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Confirmation Modal for Admin Deleting Listing (Req 6.5) */}
      {deleteModalListing && (
        <div id="admin-listing-delete-modal" className="modal-backdrop">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" className="modal-title">Confirm Listing Removal</h2>
            <p className="modal-description">
              Are you sure you want to delete the listing{" "}
              <strong>"{deleteModalListing.title}"</strong> (ID: #{deleteModalListing.listing_id})
              owned by <strong>{deleteModalListing.owner_name}</strong>?
            </p>
            <p className="modal-warning">
              ⚠️ This action is permanent and will remove the item, its uploaded photos, and related chat history from the platform.
            </p>
            <div className="modal-actions">
              <button
                id="btn-cancel-admin-delete"
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteModalListing(null)}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-admin-delete"
                type="button"
                className="btn-danger"
                onClick={confirmDeleteListing}
                disabled={processingAction}
              >
                {processingAction ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

