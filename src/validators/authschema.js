import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: "Current password is required",
      invalid_type_error: "Current password must be a string",
    })
    .min(6, "Current password must be at least 6 characters"),

  newPassword: z
    .string({
      required_error: "New password is required",
      invalid_type_error: "New password must be a string",
    })
    .min(6, "New password must be at least 6 characters")
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: "Password must contain letters and numbers",
    }),
});
export const forgotPasswordSchema = z.object({
  email: z.string().email("Email is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email is required"),
  code: z
    .string()
    .length(6, "OTP must be 6 characters")
    .regex(/^\d+$/, "OTP must be numeric"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: "Password must contain letters and numbers",
    }),
});
