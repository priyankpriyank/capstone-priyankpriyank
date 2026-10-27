import { Link, useNavigate } from "react-router-dom";
import "./NotFound.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-badge">Error 404</div>
        <div className="notfound-illustration">
          <span className="notfound-emoji">🔍</span>
          <span className="notfound-glitch">404</span>
        </div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-description">
          The page you are looking for doesn't exist, was removed, or might be temporarily unavailable.
        </p>

        <div className="notfound-actions">
          <button
            type="button"
            className="notfound-btn-back"
            onClick={() => navigate(-1)}
          >
            ← Go Back
          </button>
          <Link to="/" className="notfound-btn-home">
            Return to Home
          </Link>
          <Link to="/listings" className="notfound-btn-browse">
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
