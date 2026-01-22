import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { loginAuthSchema, verifyAuthSchema } from "./auth.schemas";
import { asyncHandler } from "../../utils/asyncHandler";

export class AuthController {
  /**
   * POST /api/auth/login
   * 
   */
  static loginAuth = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const result = loginAuthSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const response = await AuthService.loginAuth(result.data);
    res.status(200).json(response);
  });

  /**
   * POST /api/auth/verify
   * Verify OTP and issue JWT token
   */
  static verifyAuth = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const result = verifyAuthSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const response = await AuthService.verifyAuth(result.data);
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user (protected route)
   */
  static getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    try {
      const user = await AuthService.getCurrentUser(req.user.userId);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /api/auth/logout
   * Logout current user (client should clear JWT token)
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ ok: true, message: "Logged out successfully" });
  });
}
