import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length <= 8) {
      setError("Password must be longer than 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(newPassword)) {
      setError("Password must contain at least one special character.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        token: token.trim(),
        newPassword
      });

      if (res.data.success) {
        setMessage(res.data.message || "Password has been reset successfully!");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setError(Object.values(data.errors).join(" "));
      } else {
        setError(data?.message || "Unable to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-badge">🔒</div>
        <h1 className="auth-title">Set New Password</h1>
        <p className="auth-subtitle">Create a strong password for your NexTo account</p>

        {message && (
          <div
            id="reset-success-msg"
            className="auth-alert-banner auth-alert-success"
            role="alert"
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            id="reset-error-msg"
            className="auth-alert-banner auth-alert-error"
            role="alert"
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="reset-token-input" className="auth-label">
              Reset Token
            </label>
            <input
              id="reset-token-input"
              name="token"
              type="text"
              className="auth-input"
              placeholder="Paste your reset token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="reset-new-password-input" className="auth-label">
              New Password
            </label>
            <input
              id="reset-new-password-input"
              name="newPassword"
              type="password"
              className="auth-input"
              placeholder="Min. 9 characters, 1 uppercase, 1 special"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="reset-confirm-password-input" className="auth-label">
              Confirm New Password
            </label>
            <input
              id="reset-confirm-password-input"
              name="confirmPassword"
              type="password"
              className="auth-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="reset-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Resetting Password..." : "Update Password"}
          </button>
        </form>

        <p className="auth-footer-prompt">
          Remembered your password? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
