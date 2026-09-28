import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
    } catch (error) {
      setUser(null);
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

      setUser(response.data.user);

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
      setUser(null);
    }
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}