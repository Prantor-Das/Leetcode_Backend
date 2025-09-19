import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";

import { db } from "./src/libs/db.js";
import redisClient from "./src/libs/redisClient.js";

import authRoutes from "./src/routes/auth.route.js";
import sessionRoutes from "./src/routes/session.route.js";
import problemRoutes from "./src/routes/problem.route.js";
import executionRoute from "./src/routes/executeCode.route.js";
import submissionRoute from "./src/routes/submission.route.js";
import playlistRoutes from "./src/routes/playlist.route.js";
import healthcheckRoute from "./src/routes/healthcheck.route.js";

import {
  deleteUnverifiedUsers,
  startOtpCleanupJob,
} from "./src/worker/cleanup.js";

// Load env variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Register Redis error listener early
redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// ------------ 🔐 Secure CORS Setup ------------
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ------------ Middleware ------------
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------ Routes ------------
app.get("/", (req, res) => {
  res.send("👋 Welcome to LeetShaastra 🔥");
});

app.use("/", healthcheckRoute);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/problems", problemRoutes);
app.use("/api/v1/execute-code", executionRoute);
app.use("/api/v1/submission", submissionRoute);
app.use("/api/v1/playlist", playlistRoutes);

// ------------ Global Error Handler ------------
app.use((err, req, res, next) => {
  console.error("❗ Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ------------ Initialize App ------------
async function initializeConnection() {
  try {
    await Promise.all([
      db.$connect(),
      redisClient.isOpen ? Promise.resolve() : redisClient.connect(),
    ]);

    console.log("✅ DB and Redis connected successfully");

    // Start jobs
    startOtpCleanupJob();

    // Daily unverified user cleanup at 2 AM
    cron.schedule("0 2 * * *", async () => {
      console.log("🧹 [CRON] Running daily unverified user cleanup...");
      await deleteUnverifiedUsers();
    });

    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`✅ Allowed CORS origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("❌ Initialization error:", error);
    process.exit(1);
  }
}

initializeConnection();
