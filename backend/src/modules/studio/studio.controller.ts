import type { Request, Response } from "express";
import { StudioService } from "./studio.service";
import { updateStudioSchema } from "./studio.schemas";
import { asyncHandler } from "../../utils/asyncHandler";

export class StudioController {
  /**
   * GET /api/studio
   * Get or create the studio
   */
  static getStudio = asyncHandler(async (req: Request, res: Response) => {
    const studio = await StudioService.getOrCreateStudio();
    res.status(200).json({ studio });
  });

  /**
   * PUT /api/studio
   * Update studio profile
   */
  static updateStudio = asyncHandler(async (req: Request, res: Response) => {
    const result = updateStudioSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const studio = await StudioService.updateStudio(result.data);
    res.status(200).json({ studio });
  });
}
