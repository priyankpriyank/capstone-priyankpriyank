import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div>
      <h1>Welcome to NexTo</h1>

      <p>
        Hello, {user.full_name}
      </p>

      <p>
        Email: {user.email}
      </p>

      <p>
        Role: {user.role}
      </p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Home;