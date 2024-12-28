import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth related API calls
const auth = {
  login: async (username, password) => {
    try {
      const response = await api.post("/api/login", { username, password });
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
      const response = await api.get("/api/logout");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  checkAuth: async () => {
    try {
      const response = await api.get("/api/check-auth");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  googleAuth: () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
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

// Error handling helper
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    return {
      message: error.response.data.message || "An error occurred",
      status: error.response.status,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: "No response from server",
      status: 503,
    };
  } else {
    // Request setup error
    return {
      message: "Error setting up request",
      status: 500,
    };
  }
};

export { api, auth, secrets, handleApiError };
