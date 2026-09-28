import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Profile</h1>

      <p>
        Name: {user?.full_name}
      </p>

      <p>
        Email: {user?.email}
      </p>

      <p>
        Role: {user?.role}
      </p>
    </div>
  );
}

export default Profile;