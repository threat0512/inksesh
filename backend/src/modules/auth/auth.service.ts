import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import type { LoginAuthInput, VerifyAuthInput } from "./auth.schemas";

const MOCK_OTP = "123456";

export class AuthService {
    /**
     * Login authentication flow - finds or creates admin user and returns mock OTP in dev
     */
  static async loginAuth(data: LoginAuthInput) {
    const { phone } = data;

    // Find or create admin user
    await prisma.adminUser.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    // In development, return the OTP for testing
    if (env.NODE_ENV === "development") {
      return { otp: MOCK_OTP };
    }

    // In production, just acknowledge
    return { ok: true };
  }

  
//    * TODO: Replace mock OTP with real SMS provider (e.g., Twilio, AWS SNS, etc.)
  
  static async verifyAuth(data: VerifyAuthInput) {
    const { phone, otp } = data;

    // TODO: Replace this mock OTP check with real OTP verification
    // For now, accept "123456" in all environments
    if (otp !== MOCK_OTP) {
      throw new Error("Invalid OTP");
    }

    // Find the user
    const user = await prisma.adminUser.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new Error("User not found. Please start authentication first.");
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    return {
      token
    };
  }

  /**
   * Get current user by ID
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      phone: user.phone,
    };
  }
}
