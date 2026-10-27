import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setDevToken("");

    const form = new FormData(e.currentTarget);
    const submittedEmail = form.get("email") || email;

    if (!submittedEmail || !submittedEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", {
        email: submittedEmail.trim()
      });

      if (res.data.success) {
        setMessage(res.data.message || "Password reset instructions have been requested.");
        if (res.data.resetToken) {
          setDevToken(res.data.resetToken);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to process password reset request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-badge">🔑</div>
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">
          Enter your account email and we&apos;ll send you a password reset link or token.
        </p>

        {message && (
          <div
            id="forgot-success-msg"
            className="auth-alert-banner auth-alert-success"
            role="alert"
          >
            ✓ {message}
          </div>
        )}

        {devToken && (
          <div
            style={{
              background: "var(--bg-subtle)",
              border: "1px dashed var(--primary)",
              borderRadius: "var(--radius-md)",
              padding: "14px",
              marginBottom: "18px",
              fontSize: "13px"
            }}
          >
            <strong>Development Reset Token:</strong>
            <p
              style={{
                fontFamily: "monospace",
                wordBreak: "break-all",
                color: "var(--primary)",
                margin: "6px 0 10px"
              }}
            >
              {devToken}
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              style={{ padding: "8px 14px", fontSize: "13px", margin: 0 }}
              onClick={() => navigate(`/reset-password?token=${devToken}`)}
            >
              Proceed to Reset Password →
            </button>
          </div>
        )}

        {error && (
          <div
            id="forgot-error-msg"
            className="auth-alert-banner auth-alert-error"
            role="alert"
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="forgot-email-input" className="auth-label">
              Registered Email Address
            </label>
            <input
              id="forgot-email-input"
              name="email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            id="forgot-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Sending Request..." : "Request Reset Link"}
          </button>
        </form>

        <p className="auth-footer-prompt">
          Remember your password? <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
