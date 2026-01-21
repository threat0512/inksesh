import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Request } from "express";

interface JWTPayload {
  userId: string;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ ok: false, message: "Missing or invalid authorization header" });
      return;
    }

    // Remove "Bearer " prefix
    const token = authHeader.substring(7); 

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = { userId: decoded.userId };
      next();
    } catch (err) {
      res.status(401).json({ ok: false, message: "Invalid or expired token" });
      return;
    }
  } catch (err) {
    next(err);
  }
};
