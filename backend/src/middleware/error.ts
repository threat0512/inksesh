import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ ok: false, message: "Validation error", issues: err.flatten().fieldErrors });
  }

  console.error(err);
  return res.status(500).json({ ok: false, message: "Internal server error" });
};
