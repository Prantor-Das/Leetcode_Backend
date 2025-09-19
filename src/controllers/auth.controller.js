import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  welcomeEmailContent,
} from "../utils/mail.js";
import { canSendOtp, saveOtp, verifyOtp } from "../utils/otp.js";
import { UserRole } from "../libs/db.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authschema.js";
import { addDays } from "date-fns";
import { verifyGoogleToken } from "../utils/verifyGoogleToken.js";

// Helper to get IP address
const getIpAddress = (req) => {
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  return rawIp?.split(",")[0].trim();
};

// Helper to convert time string to milliseconds
const convertToMilliseconds = (timeString) => {
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      return parseInt(timeString) * 1000; // fallback for numeric values
  }
};

// Helper to generate tokens
const generateTokens = async (user, sessionId) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.id, sessionId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );

  await db.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: convertToMilliseconds(process.env.ACCESS_TOKEN_EXPIRY),
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: convertToMilliseconds(process.env.REFRESH_TOKEN_EXPIRY),
    });
};

const registerUser = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await db.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        role: data.role || UserRole.USER,
        isVerified: false,
      },
    });

    const { allowed, reason } = await canSendOtp(user.id, "EMAIL_VERIFICATION");
    if (!allowed) {
      return res.status(400).json({ success: false, message: reason });
    }

    const otp = await saveOtp(user.id, "EMAIL_VERIFICATION");

    await sendEmail({
      email: user.email,
      subject: "Verify your email",
      mailgenContent: emailVerificationMailgenContent(user.username, otp.code),
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code, type } = req.body;

  try {
    const ipAddress = getIpAddress(req);

    const user = await db.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User already verified" });
    }

    const valid = await verifyOtp(user.id, code, type);

    if (!valid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });

    if (valid) {
      await sendEmail({
        email: user.email,
        subject: "Welcome to LeetShaastra",
        mailgenContent: welcomeEmailContent(user.username),
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    const session = await db.session.create({
      data: {
        userId: user.id,
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress,
        expiresAt: addDays(new Date(), 7),
      },
    });

    const { accessToken, refreshToken } = await generateTokens(
      user,
      session.id
    );
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email" });
    }

    const ipAddress = getIpAddress(req);

    const session = await db.session.create({
      data: {
        userId: user.id,
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress,
        expiresAt: addDays(new Date(), 7),
      },
    });

    const { accessToken, refreshToken } = await generateTokens(
      user,
      session.id
    );
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const logoutUser = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET
        );
        if (decoded?.sessionId) {
          await db.session
            .delete({
              where: { id: decoded.sessionId },
            })
            .catch((err) => {
              // Session might already be deleted, which is fine
              console.warn("Session deletion warning:", err.message);
            });
        }
      } catch (err) {
        console.warn("Token verification failed during logout:", err.message);
      }
    }

    res
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions);

    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const resendEmailVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.isVerified)
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });

    const { allowed, reason } = await canSendOtp(
      user.id,
      "RESEND_EMAIL_VERIFICATION"
    );
    if (!allowed)
      return res.status(400).json({ success: false, message: reason });

    const otp = await saveOtp(user.id, "RESEND_EMAIL_VERIFICATION");

    await sendEmail({
      email: user.email,
      subject: "Resend Email Verification",
      mailgenContent: emailVerificationMailgenContent(user.username, otp.code),
    });

    return res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const { allowed, reason } = await canSendOtp(user.id, "FORGOT_PASSWORD");
    if (!allowed)
      return res.status(400).json({ success: false, message: reason });

    const otp = await saveOtp(user.id, "FORGOT_PASSWORD");

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      mailgenContent: forgotPasswordMailgenContent(user.username, otp.code),
    });

    return res
      .status(200)
      .json({ success: true, message: "Password reset OTP sent successfully" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const resetForgottenPassword = async (req, res) => {
  try {
    const { email, code, password } = resetPasswordSchema.parse(req.body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const valid = await verifyOtp(user.id, code, "FORGOT_PASSWORD");
    if (!valid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old password",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all existing sessions for security
    await db.session.deleteMany({ where: { userId: user.id } });

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const changeCurrentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions except current one
    await db.session.deleteMany({
      where: {
        userId: user.id,
        id: { not: req.user.sessionId },
      },
    });

    const ipAddress = getIpAddress(req);
    const expiresAt = addDays(new Date(), 7);

    const session = await db.session.create({
      data: {
        userId: user.id,
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress,
        expiresAt,
      },
    });

    const { accessToken, refreshToken } = await generateTokens(
      user,
      session.id
    );
    setAuthCookies(res, accessToken, refreshToken);

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const refreshTokenHandler = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const user = await db.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    if (user.refreshToken !== token) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token mismatch" });
    }

    const session = await db.session.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session) {
      return res
        .status(401)
        .json({ success: false, message: "Session expired or invalid" });
    }

    const { accessToken, refreshToken } = await generateTokens(
      user,
      session.id
    );
    setAuthCookies(res, accessToken, refreshToken);

    await db.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token, role } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    if (!role || !["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Valid role (USER or ADMIN) is required",
      });
    }

    let payload;
    try {
      payload = await verifyGoogleToken(token);

      if (!payload.success) {
        return res
          .status(400)
          .json({ success: false, message: payload.message });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required Google account information",
      });
    }

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: "Google email is not verified",
      });
    }

    let user;

    user = await db.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await db.user.findUnique({
        where: { email },
      });

      if (user) {
        if (user.provider && user.provider !== "google") {
          return res.status(400).json({
            success: false,
            message: `This email is already registered with ${user.provider}. Please use ${user.provider} login.`,
          });
        }

        user = await db.user.update({
          where: { id: user.id },
          data: {
            googleId,
            provider: "google",
            image: picture || user.image,
            isVerified: true,
            role: role,
          },
        });
      } else {
        user = await db.user.create({
          data: {
            googleId,
            email,
            username: name,
            image: picture,
            role,
            provider: "google",
            isVerified: true,
          },
        });
      }
    } else {
      const updateData = {};
      if (user.role !== role) {
        updateData.role = role;
      }
      if (picture && user.image !== picture) {
        updateData.image = picture;
      }

      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const ipAddress = getIpAddress(req);
    const userAgent = req.headers["user-agent"] || "unknown";

    const session = await db.session.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        expiresAt: addDays(new Date(), 7),
      },
    });

    const { accessToken, refreshToken } = await generateTokens(
      user,
      session.id
    );
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        image: user.image,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Google authentication",
    });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  resendEmailVerification,
  forgotPasswordRequest,
  resetForgottenPassword,
  changeCurrentPassword,
  getCurrentUser,
  refreshTokenHandler,
  googleLogin,
};
