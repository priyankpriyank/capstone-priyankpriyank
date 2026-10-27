import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const submissionData = {
      fullName: form.get("fullName") || formData.fullName,
      email: form.get("email") || formData.email,
      password: form.get("password") || formData.password
    };

    try {
      const response = await api.post(
        "/auth/register",
        submissionData
      );

      setMessage(response.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      const data = error.response?.data;

      if (data?.errors) {
        setError(
          Object.values(data.errors).join(" ")
        );
      } else {
        setError(
          data?.message || "Unable to create account"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-badge">🛍️</div>
        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">Join the NexTo marketplace community today</p>

        {message && (
          <div
            id="register-success-msg"
            className="auth-alert-banner auth-alert-success"
            role="alert"
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            id="register-error-msg"
            className="auth-alert-banner auth-alert-error"
            role="alert"
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="fullName" className="auth-label">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="auth-input"
              defaultValue=""
              placeholder="e.g., John Doe"
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="email" className="auth-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="auth-input"
              defaultValue=""
              placeholder="you@example.com"
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="auth-input"
              defaultValue=""
              placeholder="Min. 9 characters, 1 uppercase, 1 special"
              onChange={handleChange}
              required
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-prompt">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;