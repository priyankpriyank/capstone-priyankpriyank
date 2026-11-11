import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route guard enforcing Admin role privileges (Req 1.5).
 * - Redirects unauthenticated visitors to /login.
 * - Redirects non-admin authenticated users to / (home).
 */
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading && !user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "var(--text-muted)",
          fontSize: "15px"
        }}
      >
        Loading administration panel...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = (user.role || "").toLowerCase() === "admin";
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
