import React, { useState, useEffect } from "react";
import Home from "./Home";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import SecretPage from "./SecretPage";
import { Navigate } from "react-router-dom";
import axios from "axios";
import LoadingScreen from "./LoadingScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null until we check

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/check-auth", {
          withCredentials: true,
        });
        if (response.status === 200) {
          setIsAuthenticated(true); // User is authenticated
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false); // User is not authenticated
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <LoadingScreen />; // Show a loading indicator while checking
  }
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route
          path="/secrets"
          element={isAuthenticated ? <SecretPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
