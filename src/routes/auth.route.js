import express from "express";

import { authRateLimiter, isLoggedIn } from "../middleware/auth.middleware.js";
import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  googleLogin,
  loginUser,
  logoutUser,
  refreshTokenHandler,
  registerUser,
  resendEmailVerification,
  verifyEmail,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Public Routes
router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", authRateLimiter, resendEmailVerification);
router.post("/forgot-password", authRateLimiter, forgotPasswordRequest);

router.post("/refresh", refreshTokenHandler
);
router.post("/google-auth", googleLogin);

// Protected Routes
router.post("/logout", isLoggedIn, logoutUser);
router.get("/me", isLoggedIn, getCurrentUser);
router.patch("/change-password", isLoggedIn, changeCurrentPassword);

export default router;
