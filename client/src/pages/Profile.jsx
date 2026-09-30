import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
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

  // Fetch full profile including listing stats
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.get("/profile");
        if (isMounted && res.data.success) {
          setProfileData(res.data.profile);
          setInfoForm({
            fullName: res.data.profile.full_name || "",
            email: res.data.profile.email || ""
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (isMounted && user) {
          setInfoForm({
            fullName: user.full_name || "",
            email: user.email || ""
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle Profile Info Submit (Req 2.2)
  async function handleInfoSubmit(e) {
    e.preventDefault();
    setInfoSuccess("");
    setInfoError("");
    setInfoLoading(true);

    try {
      const res = await api.put("/profile", {
        fullName: infoForm.fullName,
        email: infoForm.email
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

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwordForm.newPassword.length <= 8) {
      setPasswordError("Password must be longer than 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(passwordForm.newPassword)) {
      setPasswordError("Password must contain at least one special character.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.put("/profile/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
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
                className={`badge ${
                  displayStatus === "active"
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
        </main>
      </div>
    </div>
  );
}

export default Profile;