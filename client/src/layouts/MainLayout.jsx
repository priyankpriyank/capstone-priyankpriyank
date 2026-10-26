import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div>
      <header>
        <nav>
          <Link to="/">NexTo</Link>

          <div>
            <Link id="nav-link-home" to="/">Home</Link>
            <Link id="nav-link-listings" to="/listings">Browse Listings</Link>

            {user && (
              <>
                <Link id="nav-link-create-listing" to="/create-listing">
                  Create Listing
                </Link>

                <Link id="nav-link-messages" to="/messages">
                  Messages
                </Link>

                <Link id="nav-link-profile" to="/profile">
                  Profile
                </Link>

                <button id="nav-btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;