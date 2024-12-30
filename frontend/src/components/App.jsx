import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./Home";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import SecretPage from "./SecretPage";
import LoadingScreen from "./LoadingScreen";
import { auth } from "./api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await auth.checkAuth();
        setIsAuthenticated(isAuth);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/secrets" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/secrets" /> : <SignUpPage />
          }
        />
        <Route
          path="/secrets"
          element={isAuthenticated ? <SecretPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
