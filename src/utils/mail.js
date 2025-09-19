import Mailgen from "mailgen";
import nodemailer from "nodemailer";

// Initialize Mailgen instance once
const mailGenerator = new Mailgen({
  theme: "default",
  product: {
    name: "LeetShaastra",
    link: "https://leetshaastra.in",
  },
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: parseInt(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

/**
 * Sends an email using Mailgen & Nodemailer.
 * @param {Object} options - Email details
 * @param {string} options.email - Recipient's email
 * @param {string} options.subject - Email subject
 * @param {Object} options.mailgenContent - Mailgen content structure
 */
export const sendEmail = async ({ email, subject, mailgenContent }) => {
  try {
    const html = mailGenerator.generate(mailgenContent);
    const text = mailGenerator.generatePlaintext(mailgenContent);

    const mailOptions = {
      from: process.env.MAILTRAP_SENDERMAIL,
      to: email,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("❌ Failed to send email. Check Mailtrap or SMTP settings.");
    console.error(error);
  }
};

/**
 * Generates Mailgen content for email verification via OTP
 */
export const emailVerificationMailgenContent = (username, otp) => ({
  body: {
    name: username,
    intro: [
      "Welcome to LeetShaastra! 🚀",
      "We're excited to have you join our community of coding enthusiasts. Let's verify your email to get you started on your programming journey."
    ],
    action: {
      instructions: "Please use the following One-Time Password (OTP) to verify your email address:",
      button: {
        color: "#22BC66",
        text: `${otp}`,
        link: "https://leetshaastra.in/verify",
      },
    },
    outro: [
      "⏰ This OTP is valid for 10 minutes only.",
      "🔒 For your security, never share this OTP with anyone.",
      "Having trouble? Reply to this email and our support team will help you out!"
    ],
  },
});

/**
 * Generates Mailgen content for forgot password via OTP
 */
export const forgotPasswordMailgenContent = (username, otp) => ({
  body: {
    name: username,
    intro: [
      "Password Reset Request 🔐",
      "We received a request to reset your LeetShaastra account password. No worries, it happens to the best of us!"
    ],
    action: {
      instructions: "Use the following OTP to create a new password for your account:",
      button: {
        color: "#F56565",
        text: `${otp}`,
        link: "https://leetshaastra.in/reset-password",
      },
    },
    outro: [
      "⏰ This OTP will expire in 10 minutes for security reasons.",
      "🚫 If you didn't request this password reset, please ignore this email - your account remains secure.",
      "🔒 Never share this OTP with anyone for your account safety.",
      "Need assistance? Just reply to this email and we'll be happy to help!"
    ],
  },
});

/**
 * Generates Mailgen content for welcome email (no action required)
 */
export const welcomeEmailContent = (username) => ({
  body: {
    name: username,
    intro: [
      "🎉 Welcome to LeetShaastra!",
      "Your coding journey starts here! We're thrilled to have you as part of our growing community of developers, problem-solvers, and tech enthusiasts."
    ],
    action: {
      instructions: "Ready to dive in? Here's what awaits you:",
      button: {
        color: "#007BFF",
        text: "Explore Your Dashboard",
        link: "https://leetshaastra.in/dashboard",
      },
    },
    outro: [
      "🚀 What you can do on LeetShaastra:",
      "• Solve challenging coding problems across multiple difficulty levels",
      "• Track your progress with detailed analytics and achievements",
      "• Participate in coding contests and challenges",
      "• Learn from comprehensive tutorials and coding resources",
      "• Connect with fellow developers in our community",
      "",
      "💡 Pro tip: Start with our beginner-friendly problems to get familiar with the platform!",
      "",
      "Questions or need help getting started? Simply reply to this email - our team is here to support you every step of the way!"
    ],
  },
});