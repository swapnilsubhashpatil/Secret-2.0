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
import pgSession from "connect-pg-simple";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

const isProduction = process.env.NODE_ENV === "production";

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

const PgStore = pgSession(session);

const sessionConfig = {
  store: new PgStore({
    pool: db,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
  proxy: isProduction,
};

app.set("trust proxy", 1);
app.use(session(sessionConfig));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new Strategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          username,
        ]);

        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;

          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              return cb(err);
            }
            if (valid) {
              return cb(null, user);
            }
            return cb(null, false, { message: "Invalid password" });
          });
        } else {
          return cb(null, false, { message: "User not found" });
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// Routes
app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || "Login failed",
      });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Login error" });
      }
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    });
  })(req, res, next);
});

// ... (rest of your existing routes remain the same)

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running`);
});
