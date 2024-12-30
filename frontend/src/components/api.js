import axios from "axios";

const api = axios.create({
  baseURL: "https://secret-2-0.onrender.com",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth related API calls
const auth = {
  login: async (username, password) => {
    try {
      const response = await api.post("/api/login", { username, password });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  register: async (username, password) => {
    try {
      const response = await api.post("/api/register", { username, password });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: async () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const response = await api.get("/api/check-auth");
      return response.status === 200;
    } catch (error) {
      localStorage.removeItem("token");
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
