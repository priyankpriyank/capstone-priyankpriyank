import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getImageUrl } from "../services/api";
import "./Profile.css";

function Profile() {
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  // Form 1: Profile Information
  const [infoForm, setInfoForm] = useState({
    fullName: "",
    email: ""
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState("");
  const [infoError, setInfoError] = useState("");

  // Form 2: Password Change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Week 6: User's Own Listings (Req 2.1, 4.4 - 4.6)
  const [userListings, setUserListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingMsg, setListingMsg] = useState("");

  // Fetch full profile including listing stats & user listings
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setListingsLoading(true);
        const [profileRes, listingsRes] = await Promise.all([
          api.get("/profile"),
          api.get("/listings/user/me")
        ]);

        if (isMounted && profileRes.data.success) {
          setProfileData(profileRes.data.profile);
          setInfoForm({
            fullName: profileRes.data.profile.full_name || "",
            email: profileRes.data.profile.email || ""
          });
        }

        if (isMounted && listingsRes.data.success) {
          setUserListings(listingsRes.data.listings || []);
        }
      } catch (err) {
        console.error("Failed to load profile or listings:", err);
        if (isMounted && user) {
          setInfoForm({
            fullName: user.full_name || "",
            email: user.email || ""
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setListingsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Week 6: Toggle Status in Profile (Req 4.6)
  async function handleToggleListingStatus(listingId) {
    try {
      const res = await api.patch(`/listings/${listingId}/sold`);
      if (res.data.success) {
        const newStatus = res.data.listing.status;
        setUserListings((prev) =>
          prev.map((item) =>
            item.listing_id === listingId ? { ...item, status: newStatus } : item
          )
        );
        // Update stats counter
        setProfileData((prev) => {
          if (!prev?.stats) return prev;
          const activeChange = newStatus === "active" ? 1 : -1;
          const soldChange = newStatus === "sold" ? 1 : -1;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              active_listings: Math.max(0, prev.stats.active_listings + activeChange),
              sold_listings: Math.max(0, prev.stats.sold_listings + soldChange)
            }
          };
        });
        setListingMsg(`✓ Listing marked as ${newStatus.toUpperCase()}`);
        setTimeout(() => setListingMsg(""), 3500);
      }
    } catch (err) {
      console.error("Failed to toggle listing status:", err);
    }
  }

  // Week 6: Delete Listing in Profile (Req 4.5)
  async function handleDeleteListing(listingId) {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await api.delete(`/listings/${listingId}`);
      if (res.data.success) {
        setUserListings((prev) => prev.filter((item) => item.listing_id !== listingId));
        setListingMsg("✓ Listing deleted successfully");
        setTimeout(() => setListingMsg(""), 3500);
      }
    } catch (err) {
      console.error("Failed to delete listing:", err);
    }
  }

  // Handle Profile Info Submit (Req 2.2)
  async function handleInfoSubmit(e) {
    e.preventDefault();
    setInfoSuccess("");
    setInfoError("");
    setInfoLoading(true);

    const form = new FormData(e.currentTarget);
    const fullName = form.get("fullName") || infoForm.fullName;
    const email = form.get("email") || infoForm.email;

    try {
      const res = await api.put("/profile", {
        fullName,
        email
      });

      if (res.data.success) {
        setInfoSuccess(res.data.message || "Profile updated successfully.");
        // Update local and context state
        updateUser(res.data.user);
        setProfileData((prev) => ({
          ...prev,
          full_name: res.data.user.full_name,
          email: res.data.user.email
        }));
      }
    } catch (err) {
      const msg =
        err.response?.data?.errors?.fullName ||
        err.response?.data?.errors?.email ||
        err.response?.data?.message ||
        "Unable to update profile. Please try again.";
      setInfoError(msg);
    } finally {
      setInfoLoading(false);
    }
  }

  // Handle Password Change Submit (Req 2.3)
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("currentPassword") || passwordForm.currentPassword;
    const newPassword = form.get("newPassword") || passwordForm.newPassword;
    const confirmPassword = form.get("confirmPassword") || passwordForm.confirmPassword;

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length <= 8) {
      setPasswordError("Password must be longer than 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(newPassword)) {
      setPasswordError("Password must contain at least one special character.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.put("/profile/change-password", {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.data.success) {
        setPasswordSuccess(res.data.message || "Password changed successfully.");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.errors?.newPassword ||
        err.response?.data?.errors?.currentPassword ||
        err.response?.data?.message ||
        "Unable to change password. Please check your current password.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  }

  // Compute initials for avatar
  const displayName = profileData?.full_name || user?.full_name || "User";
  const displayEmail = profileData?.email || user?.email || "";
  const displayRole = profileData?.role || user?.role || "User";
  const displayStatus = profileData?.account_status || user?.account_status || "active";
  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
    : "Recently";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Password rules validation flags for real-time checklist
  const hasMinLength = passwordForm.newPassword.length > 8;
  const hasUppercase = /[A-Z]/.test(passwordForm.newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(passwordForm.newPassword);
  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  if (loading && !profileData && !user) {
    return (
      <div className="profile-page-container">
        <p>Loading profile information...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <header className="profile-header-section">
        <h1 className="profile-page-title">User Profile</h1>
        <p className="profile-page-subtitle">
          Manage your personal details, credentials, and view account activity.
        </p>
      </header>

      <div className="profile-layout-grid">
        {/* Left Sidebar (Desktop Mockup 6) */}
        <aside className="profile-sidebar-card" aria-label="Profile summary">
          <div className="profile-user-summary">
            <div id="profile-avatar-circle" className="profile-avatar-circle">
              {initials || "U"}
            </div>
            <h2 className="profile-display-name">{displayName}</h2>
            <p className="profile-display-email">{displayEmail}</p>

            <div className="profile-badges-row">
              <span className="badge badge-role">{displayRole}</span>
              <span
                className={`badge ${displayStatus === "active"
                    ? "badge-status-active"
                    : "badge-status-deactivated"
                  }`}
              >
                {displayStatus}
              </span>
            </div>
          </div>

          <div className="profile-meta-details">
            <div className="profile-meta-row">
              <span className="profile-meta-label">Member Since</span>
              <span className="profile-meta-value">{memberSince}</span>
            </div>
          </div>

          {/* Listing Statistics (Desktop Mockup 6) */}
          <div className="profile-stats-section">
            <h3 className="profile-stats-heading">Listing Statistics</h3>
            <div className="profile-stats-grid">
              <div className="stat-card" id="profile-stat-active">
                <div className="stat-number">
                  {profileData?.stats?.active_listings ?? 0}
                </div>
                <div className="stat-label">Active Listings</div>
              </div>
              <div className="stat-card" id="profile-stat-sold">
                <div className="stat-number">
                  {profileData?.stats?.sold_listings ?? 0}
                </div>
                <div className="stat-label">Items Sold</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Panels */}
        <main className="profile-main-panels">
          {/* Section 1: Edit Profile Info (Req 2.1, 2.2) */}
          <section className="profile-panel-card" aria-labelledby="heading-edit-profile">
            <div className="panel-card-header">
              <h2 id="heading-edit-profile" className="panel-card-title">
                Personal Information
              </h2>
              <p className="panel-card-subtitle">
                Update your full name and primary email address.
              </p>
            </div>

            {infoSuccess && (
              <div className="alert-banner alert-success" role="alert" id="profile-info-success">
                ✓ {infoSuccess}
              </div>
            )}
            {infoError && (
              <div className="alert-banner alert-error" role="alert" id="profile-info-error">
                ⚠️ {infoError}
              </div>
            )}

            <form onSubmit={handleInfoSubmit} className="profile-form">
              <div className="profile-form-row">
                <label htmlFor="profile-fullName-input" className="profile-form-label">
                  Full Name
                </label>
                <input
                  id="profile-fullName-input"
                  name="fullName"
                  type="text"
                  className="profile-input"
                  value={infoForm.fullName}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="profile-form-row">
                <label htmlFor="profile-email-input" className="profile-form-label">
                  Email Address
                </label>
                <input
                  id="profile-email-input"
                  name="email"
                  type="email"
                  className="profile-input"
                  value={infoForm.email}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, email: e.target.value })
                  }
                  required
                />
              </div>

              <button
                type="submit"
                id="profile-save-info-btn"
                className="profile-btn-primary"
                disabled={infoLoading}
              >
                {infoLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </section>

          {/* Section 2: Change Password (Req 2.3) */}
          <section className="profile-panel-card" aria-labelledby="heading-change-password">
            <div className="panel-card-header">
              <h2 id="heading-change-password" className="panel-card-title">
                Change Password
              </h2>
              <p className="panel-card-subtitle">
                Update your password to keep your account safe and secure.
              </p>
            </div>

            {passwordSuccess && (
              <div
                className="alert-banner alert-success"
                role="alert"
                id="profile-password-success"
              >
                ✓ {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div
                className="alert-banner alert-error"
                role="alert"
                id="profile-password-error"
              >
                ⚠️ {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="profile-form-row">
                <label
                  htmlFor="profile-currentPassword-input"
                  className="profile-form-label"
                >
                  Current Password
                </label>
                <input
                  id="profile-currentPassword-input"
                  name="currentPassword"
                  type="password"
                  className="profile-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="profile-form-row">
                <label
                  htmlFor="profile-newPassword-input"
                  className="profile-form-label"
                >
                  New Password
                </label>
                <input
                  id="profile-newPassword-input"
                  name="newPassword"
                  type="password"
                  className="profile-input"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value
                    })
                  }
                  required
                />

                {/* Password Criteria Checklist (Req 1.1.2) */}
                <ul className="password-criteria-list" aria-label="Password requirements">
                  <li className={`criteria-item ${hasMinLength ? "met" : ""}`}>
                    <span className="criteria-icon">{hasMinLength ? "✓" : "○"}</span>
                    Longer than 8 characters
                  </li>
                  <li className={`criteria-item ${hasUppercase ? "met" : ""}`}>
                    <span className="criteria-icon">{hasUppercase ? "✓" : "○"}</span>
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={`criteria-item ${hasSpecial ? "met" : ""}`}>
                    <span className="criteria-icon">{hasSpecial ? "✓" : "○"}</span>
                    At least one special character (!@#$%^&*...)
                  </li>
                  {passwordForm.confirmPassword && (
                    <li className={`criteria-item ${passwordsMatch ? "met" : ""}`}>
                      <span className="criteria-icon">{passwordsMatch ? "✓" : "○"}</span>
                      Passwords match
                    </li>
                  )}
                </ul>
              </div>

              <div className="profile-form-row">
                <label
                  htmlFor="profile-confirmPassword-input"
                  className="profile-form-label"
                >
                  Confirm New Password
                </label>
                <input
                  id="profile-confirmPassword-input"
                  name="confirmPassword"
                  type="password"
                  className="profile-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value
                    })
                  }
                  required
                />
              </div>

              <button
                type="submit"
                id="profile-change-password-btn"
                className="profile-btn-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </section>

          {/* Section 3: My Published Listings (Req 2.1, 4.4 - 4.6) */}
          <section className="profile-panel-card" id="profile-my-listings-section">
            <div className="panel-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 className="panel-card-title">My Marketplace Listings</h2>
                <p className="panel-card-subtitle">
                  Manage your items for sale, update pricing, or mark items as sold.
                </p>
              </div>
              <Link to="/create-listing" className="profile-btn-primary" style={{ padding: "8px 16px", fontSize: "13.5px" }}>
                + Post New Item
              </Link>
            </div>

            {listingMsg && (
              <div className="alert-banner alert-success" role="alert" style={{ marginBottom: "16px" }}>
                {listingMsg}
              </div>
            )}

            {listingsLoading ? (
              <p>Loading your listings...</p>
            ) : userListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                <p style={{ margin: "0 0 12px" }}>You have not posted any marketplace listings yet.</p>
                <Link to="/create-listing" className="profile-btn-primary">
                  Create Your First Listing
                </Link>
              </div>
            ) : (
              <div className="user-listings-list">
                {userListings.map((item) => (
                  <div key={item.listing_id} className="user-listing-item-card">
                    <div className="item-thumb-box">
                      {item.primary_photo ? (
                        <img
                          src={getImageUrl(item.primary_photo)}
                          alt={item.title}
                          className="item-thumb-img"
                        />
                      ) : (
                        <span>📷</span>
                      )}
                    </div>
                    <div className="item-details-box">
                      <div className="item-top-info">
                        <span className={`status-chip ${item.status === "active" ? "status-active" : "status-sold"}`}>
                          {item.status}
                        </span>
                        <span className="category-chip" style={{ fontSize: "11px", padding: "2px 8px" }}>
                          {item.category_name}
                        </span>
                      </div>
                      <h4 className="item-title">{item.title}</h4>
                      <p className="item-price">${Number(item.price).toFixed(2)}</p>
                    </div>
                    <div className="item-actions-box">
                      <Link to={`/listings/${item.listing_id}`} className="btn-secondary" style={{ padding: "7px 12px", fontSize: "12.5px" }}>
                        View
                      </Link>
                      <button
                        type="button"
                        className={`btn-toolbar ${item.status === "active" ? "btn-mark-sold" : "btn-mark-active"}`}
                        style={{ padding: "7px 12px", fontSize: "12.5px" }}
                        onClick={() => handleToggleListingStatus(item.listing_id)}
                      >
                        {item.status === "active" ? "Mark Sold" : "Mark Active"}
                      </button>
                      <button
                        type="button"
                        className="btn-toolbar btn-delete"
                        style={{ padding: "7px 12px", fontSize: "12.5px" }}
                        onClick={() => handleDeleteListing(item.listing_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Profile;