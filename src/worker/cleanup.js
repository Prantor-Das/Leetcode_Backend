import cron from "node-cron";
import { db } from "../libs/db.js";

export function startOtpCleanupJob() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const result = await db.verificationCode.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      console.log(`[OTP Cleanup] Deleted ${result.count} expired OTP(s)`);
    } catch (err) {
      console.error("[OTP Cleanup] Failed:", err.message);
    }
  });
  console.log("[OTP Cleanup] Cron job scheduled to run every 10 minutes.");
}

export const deleteUnverifiedUsers = async () => {
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const deleted = await db.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[CRON] Deleted ${deleted.count} unverified users`);
  } catch (error) {
    console.error("[CRON] Failed to delete unverified users:", error);
  }
};
