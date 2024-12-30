import axios from "axios";

const api = axios.create({
  baseURL: "https://secret-2-0.onrender.com",
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const auth = {
  login: async (email, password) => {
    try {
      const response = await api.post("/api/login", {
        username: email,
        password,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  register: async (username, password) => {
    try {
      const response = await api.post("/api/register", { username, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: async () => {
    try {
      await api.get("/api/logout");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  },

  checkAuth: async () => {
    try {
      const response = await api.get("/api/check-auth");
      return response.data.authenticated;
    } catch (error) {
      return false;
    }
  },

  googleAuth: () => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  },
};

// Secrets related API calls
const secrets = {
  getAll: async () => {
    try {
      const response = await api.get("/api/secrets");
      return response.data.secrets;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  add: async (secret) => {
    try {
      const response = await api.post("/api/submit", { secret });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (secretId, secret) => {
    try {
      const response = await api.post("/api/submit", { secret, secretId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (secretId) => {
    try {
      const response = await api.post("/api/secrets/delete", { secretId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

const handleApiError = (error) => {
  if (error.response) {
    return {
      message: error.response.data.message || "An error occurred",
      status: error.response.status,
    };
  } else if (error.request) {
    return {
      message: "No response from server",
      status: 503,
    };
  } else {
    return {
      message: "Error setting up request",
      status: 500,
    };
  }
};

export { api, auth, secrets, handleApiError };
