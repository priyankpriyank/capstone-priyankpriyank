import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Initialize user synchronously from localStorage to prevent flash of unauthenticated state on page reload
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nexto_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
      localStorage.setItem("nexto_user", JSON.stringify(response.data.user));
    } catch (error) {
      setUser(null);
      localStorage.removeItem("nexto_user");
      localStorage.removeItem("nexto_token");
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem("nexto_token", response.data.token);
      }

      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem("nexto_user", JSON.stringify(response.data.user));
      }

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to log in"
      };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("nexto_token");
      localStorage.removeItem("nexto_user");
      setUser(null);
    }
  }

  function updateUser(updatedData) {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...updatedData } : updatedData;
      localStorage.setItem("nexto_user", JSON.stringify(updated));
      return updated;
    });
  }

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
