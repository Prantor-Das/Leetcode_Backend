import { db } from "../libs/db.js";

// Generate a secure 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if user can send OTP based on rate limiting rules
export async function canSendOtp(userId, type) {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if user sent OTP in last minute
    const recent = await db.verificationCode.findFirst({
      where: {
        userId,
        type,
        createdAt: { gt: oneMinuteAgo },
      },
    });

    if (recent) {
      return { 
        allowed: false, 
        reason: "Please wait 1 minute before requesting another OTP" 
      };
    }

    // Check hourly limit (max 5 per hour)
    const hourlyCount = await db.verificationCode.count({
      where: {
        userId,
        type,
        createdAt: { gt: oneHourAgo },
      },
    });

    if (hourlyCount >= 5) {
      return { 
        allowed: false, 
        reason: "Too many OTP requests. Please try again after 1 hour" 
      };
    }

    // Check daily limit (max 20 per day)
    const dailyCount = await db.verificationCode.count({
      where: {
        userId,
        type,
        createdAt: { gt: oneDayAgo },
      },
    });

    if (dailyCount >= 20) {
      return { 
        allowed: false, 
        reason: "Daily OTP limit exceeded. Please try again tomorrow" 
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking OTP rate limits:", error);
    return { 
      allowed: false, 
      reason: "Unable to process OTP request. Please try again later" 
    };
  }
}

// Save OTP to database
export async function saveOtp(userId, type) {
  try {
    // Delete any existing unexpired OTPs of the same type for this user
    await db.verificationCode.deleteMany({
      where: {
        userId,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = await db.verificationCode.create({
      data: { userId, code, type, expiresAt },
    });

    return otp;
  } catch (error) {
    console.error("Error saving OTP:", error);
    throw new Error("Failed to generate OTP");
  }
}

// Verify OTP code
export async function verifyOtp(userId, code, type) {
  try {
    const record = await db.verificationCode.findFirst({
      where: {
        userId,
        code,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return false;
    }

    // Delete the OTP after successful verification
    await db.verificationCode.delete({ 
      where: { id: record.id } 
    });

    return true;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return false;
  }
}
