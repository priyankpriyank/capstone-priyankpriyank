import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user } = useAuth();

  return (
    <div>
      <h1 id="home-welcome-title">Welcome to NexTo</h1>

      <p>
        Buy and sell items in your marketplace.
      </p>

      {user && (
        <p id="home-user-greeting">
          Welcome, {user.full_name}!
        </p>
      )}

      <Link to="/listings">
        Browse Listings
      </Link>
    </div>
  );
}

export default Home;