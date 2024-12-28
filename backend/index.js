import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import cors from "cors";
import fs from "fs";

import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false for better control
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true in production
      httpOnly: true, // Prevents client-side JS access
      // sameSite: "strict", // Helps prevent CSRF attacks
      maxAge: 1000 * 60 * 60 * 24, // Example: 1 day (optional)
    },
  })
);
app.use(express.json()); // Parses JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded payload

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    ca: fs.readFileSync("./certs/ca.pem").toString(),
  },
});

db.connect();
app.use(
  cors({
    origin: ["process.env.FRONTEND_URL"],
    methods: ["POST", "GET"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/api/check-auth", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ message: "Authenticated" });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

app.get("/api/secrets", async (req, res) => {
  console.log(`Received ${req.method} request at ${req.url}`);
  console.log("Is Authenticated:", req.isAuthenticated());

  if (req.isAuthenticated()) {
    try {
      const result = await db.query(
        "SELECT secret_id, secret FROM secrets WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      );
      console.log("Secrets retrieved successfully:", result.rows);
      // Respond with JSON instead of rendering EJS
      res.json({ secrets: result.rows });
    } catch (err) {
      console.error("Error retrieving secrets:", err);
      res.status(500).json({ error: "Error retrieving secrets" });
    }
  } else {
    console.log("User not authenticated. Redirecting to /login.");
    res.status(401).json({ error: "Unauthorized" });
  }
});

// app.get("/submit", function (req, res) {
//   if (req.isAuthenticated()) {
//     res.render("submit.ejs");
//   } else {
//     res.redirect("/login");
//   }
// });

app.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login`
      : "http://localhost:5175/login", // Use ternary operator
  }),
  (req, res) => {
    res.redirect(
      process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/secrets`
        : "http://localhost:5175/secrets"
    ); // Use ternary operator
  }
);

// app.post(
//   "/api/login",
//   passport.authenticate("local", { failureRedirect: null }), // Remove redirect
//   (req, res) => {
//     res.json({ message: "Login successful" });
//   }
// );

app.post("/api/login", async (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info.message || "Invalid credentials",
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Failed to establish session",
          });
        }

        // Send successful response with user data (excluding sensitive info)
        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            // Add other non-sensitive user data
          },
        });
      });
    })(req, res, next);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

app.post("/api/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect(
        process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/secrets`
          : "http://localhost:5175/secrets"
      );
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect(
              process.env.FRONTEND_URL
                ? `${process.env.FRONTEND_URL}/secrets`
                : "http://localhost:5175/secrets"
            );
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// app.post("/submit", async (req, res) => {
//   const submittedSecret = req.body.secret;
//   try {
//     await db.query("INSERT INTO secrets (user_id, secret) VALUES ($1, $2)", [
//       req.user.id,
//       submittedSecret,
//     ]);
//     res.redirect("/secrets");
//   } catch (err) {
//     console.error("Error saving secret:", err);
//     res.send("Error saving secret");
//   }
// });

// // Route to handle deletion of a secret
// app.post("/secrets/delete", async (req, res) => {
//   const secretId = req.body.secretId;
//   const userId = req.body.user_id;

//   try {
//     // Delete the secret with the specified ID for the logged-in user
//     await db.query(
//       "DELETE FROM secrets WHERE secret_id = $1 AND user_id = $2",
//       [secretId, userId]
//     );

//     // Redirect to the secrets page after deletion
//     res.redirect("/secrets");
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error deleting the secret");
//   }
// });
app.post("/api/submit", async (req, res) => {
  const { secret, secretId } = req.body;

  try {
    if (secretId) {
      // Update existing secret
      const result = await db.query(
        "UPDATE secrets SET secret = $1 WHERE secret_id = $2 AND user_id = $3 RETURNING secret_id",
        [secret, secretId, req.user.id]
      );
      res.json({ secret_id: result.rows[0].secret_id });
    } else {
      // Insert new secret
      const result = await db.query(
        "INSERT INTO secrets (user_id, secret) VALUES ($1, $2) RETURNING secret_id",
        [req.user.id, secret]
      );
      res.json({ secret_id: result.rows[0].secret_id });
    }
  } catch (err) {
    console.error("Error saving secret:", err);
    res.status(500).json({ error: "Error saving secret" });
  }
});

app.post("/api/secrets/delete", async (req, res) => {
  const { secretId } = req.body;

  try {
    await db.query(
      "DELETE FROM secrets WHERE secret_id = $1 AND user_id = $2",
      [secretId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error deleting the secret" });
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;

        // Compare the password using bcrypt
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err); // Return error if there's an issue with password comparison
          }

          // If password is valid, return user
          if (valid) {
            return cb(null, user);
          } else {
            // Password doesn't match, return error message
            return cb(null, false, { message: "Password does not match" });
          }
        });
      } else {
        // User not found
        return cb(null, false, { message: "User not found" });
      }
    } catch (err) {
      console.log("Error during authentication:", err);
      return cb(err); // Return the error if an issue occurs during query
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets", // Changed this
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // Make sure we're getting the email from the correct location
        const email = profile.emails[0].value;

        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        if (result.rows.length === 0) {
          // Create new user
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          // Existing user
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
