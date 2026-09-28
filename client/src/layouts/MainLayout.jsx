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
            <Link to="/">Home</Link>
            <Link to="/listings">Browse Listings</Link>

            {user && (
              <>
                <Link to="/create-listing">
                  Create Listing
                </Link>

                <Link to="/messages">
                  Messages
                </Link>

                <Link to="/profile">
                  Profile
                </Link>

                <button onClick={handleLogout}>
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