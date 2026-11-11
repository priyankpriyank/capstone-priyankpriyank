import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./MainLayout.css";

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    navigate("/login");
  }

  const userInitial = user?.full_name ? user.full_name[0].toUpperCase() : "U";

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="nav-container" aria-label="Main Navigation">
          <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
            <span className="brand-icon">🛍️</span>
            <span className="brand-text">NexTo</span>
          </Link>

          {/* Mobile hamburger toggle button */}
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          <div className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <NavLink
              id="nav-link-home"
              to="/"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink
              id="nav-link-listings"
              to="/listings"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Listings
            </NavLink>

            {user ? (
              <>
                <NavLink
                  id="nav-link-create-listing"
                  to="/create-listing"
                  className="nav-item nav-btn-highlight"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  + Sell Item
                </NavLink>

                <NavLink
                  id="nav-link-messages"
                  to="/messages"
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Messages
                </NavLink>

                {(user.role || "").toLowerCase() === "admin" && (
                  <NavLink
                    id="nav-link-admin"
                    to="/admin"
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🛡️ Admin
                  </NavLink>
                )}

                <NavLink
                  id="nav-link-profile"
                  to="/profile"
                  className={({ isActive }) => `user-profile-chip ${isActive ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="avatar-mini">{userInitial}</div>
                  <span className="user-name-text">{user.full_name?.split(" ")[0] || "Profile"}</span>
                </NavLink>

                <button
                  id="nav-btn-logout"
                  className="nav-btn-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  id="nav-link-login"
                  to="/login"
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink
                  id="nav-link-register"
                  to="/register"
                  className="nav-item nav-btn-highlight"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <span className="brand-icon-sm">🛍️</span>
              <span className="footer-brand-title">NexTo</span>
            </div>
            <p className="footer-tagline">
              Modern local peer-to-peer marketplace connecting trusted community buyers &amp; sellers.
            </p>
            <div className="footer-capstone-note">
              Capstone Project by <strong>Priyank Vora</strong> (Student ID: 000922930)
            </div>
          </div>
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4 className="footer-heading">Marketplace</h4>
              <Link to="/listings">Browse All</Link>
              <Link to="/create-listing">Post Listing</Link>
              <Link to="/listings?category=1">Electronics</Link>
              <Link to="/listings?category=2">Vehicles</Link>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Account</h4>
              <Link to="/profile">My Profile</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Safety &amp; Support</h4>
              <span className="footer-static-link">Verified Profiles</span>
              <span className="footer-static-link">End-to-End Chat</span>
              <span className="footer-static-link">Community Standards</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} NexTo Inc. All rights reserved. Built with React &amp; Node.js.</p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;