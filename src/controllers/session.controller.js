import { z } from "zod";
import { db } from "../libs/db.js";

// Zod schema for validating session ID
const sessionIdSchema = z.string().uuid("Invalid session ID format");

// Get all active sessions for the current user
export const getSessionsHandler = async (req, res) => {
  try {
    const sessions = await db.session.findMany({
      where: {
        userId: req.user.id,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === req.user.sessionId,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get sessions error:", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

// Delete a specific session by ID (only if it belongs to the user)
export const deleteSessionHandler = async (req, res) => {
  try {
    const sessionId = sessionIdSchema.parse(req.params.id);

    const deleted = await db.session.deleteMany({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json({ message: "Session removed successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    console.error("Delete session error:", error);
    return res.status(500).json({ message: "Failed to delete session" });
  }
};