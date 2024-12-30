import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import fs from "fs";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

// Database configuration
const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    ca: fs.readFileSync("./certs/ca.pem").toString(),
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5175",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Public Routes
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.json({
          success: true,
          token,
          user: { id: user.id, email: user.email },
        });
      }
    }

    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [username, hash]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// Protected Routes
app.get("/api/check-auth", authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

app.get("/api/secrets", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT secret_id, secret FROM secrets WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ secrets: result.rows });
  } catch (err) {
    console.error("Error fetching secrets:", err);
    res.status(500).json({ error: "Error retrieving secrets" });
  }
});

app.post("/api/submit", authenticateToken, async (req, res) => {
  const { secret, secretId } = req.body;

  try {
    let result;
    if (secretId) {
      // Update existing secret
      result = await db.query(
        "UPDATE secrets SET secret = $1 WHERE secret_id = $2 AND user_id = $3 RETURNING secret_id",
        [secret, secretId, req.user.id]
      );
    } else {
      // Create new secret
      result = await db.query(
        "INSERT INTO secrets (user_id, secret) VALUES ($1, $2) RETURNING secret_id",
        [req.user.id, secret]
      );
    }
    res.json({ secret_id: result.rows[0].secret_id });
  } catch (err) {
    console.error("Error saving secret:", err);
    res.status(500).json({ error: "Error saving secret" });
  }
});

app.post("/api/secrets/delete", authenticateToken, async (req, res) => {
  const { secretId } = req.body;

  try {
    await db.query(
      "DELETE FROM secrets WHERE secret_id = $1 AND user_id = $2",
      [secretId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting secret:", err);
    res.status(500).json({ error: "Error deleting the secret" });
  }
});

// Google OAuth Routes
app.get("/api/auth/google", (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&response_type=code&scope=email%20profile`;

  res.redirect(googleAuthUrl);
});

app.get("/auth/google/secrets", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for tokens (you'll need to implement this)
    // const tokens = await getGoogleTokens(code);
    // const profile = await getGoogleProfile(tokens.access_token);

    const email = profile.email;

    let result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    let user;

    if (result.rows.length === 0) {
      const newUser = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
        [email, "google"]
      );
      user = newUser.rows[0];
    } else {
      user = result.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("Google auth error:", err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Process handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
