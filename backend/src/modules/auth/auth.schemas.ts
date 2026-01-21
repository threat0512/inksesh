import { z } from "zod";

// follows indian phone number format
const phoneRegex = /^\+91\d{10}$/;

export const loginAuthSchema = z.object({
  phone: z.string().regex(phoneRegex, "Phone must be in format +91XXXXXXXXXX (10 digits after +91)"),
});

export const verifyAuthSchema = z.object({
  phone: z.string().regex(phoneRegex, "Phone must be in format +91XXXXXXXXXX (10 digits after +91)"),
  otp: z.string().min(6).max(6, "OTP must be exactly 6 digits"),
});

export type LoginAuthInput = z.infer<typeof loginAuthSchema>;
export type VerifyAuthInput = z.infer<typeof verifyAuthSchema>;
