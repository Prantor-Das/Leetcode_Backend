import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";
import rateLimit from "express-rate-limit";

// Rate limiting middleware for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many authentication requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware to validate access token and attach user to request
 */
export const isLoggedIn = async (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "") ||
      null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify JWT token with specific error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: "Access token expired",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Validate token payload
    if (!decoded?.id || !decoded?.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Check if session exists and is valid
    const session = await db.session.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session has expired or is invalid",
      });
    }

    // Load user and attach to request
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        email: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Block unverified users except on verification routes
    const isVerificationRoute = req.path.includes("/verify-email") || 
                               req.path.includes("/resend-verification");
    
    if (!user.isVerified && !isVerificationRoute) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Attach user data to request
    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
    });
  }
};

/**
 * Middleware to check if current user is admin
 */
export const checkAdmin = (req, res, next) => {
  try {
    const user = req.user;

    // Ensure user exists from previous middleware
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check admin role
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied — Admin only",
      });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying admin access",
    });
  }
};