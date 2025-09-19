import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (token) => {
  if (!token) {
    console.error("No Google token provided");
    return { success: false, message: "Google credential is required" };
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      console.error("Google token verification failed: No payload");
      return { success: false, message: "Token verification failed" };
    }

    return { success: true, data: payload };
  } catch (error) {
    console.error("Google token verification error:", error);
    return { success: false, message: "Invalid or expired Google token" };
  }
};
