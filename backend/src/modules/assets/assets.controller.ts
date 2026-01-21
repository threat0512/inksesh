import type { Request, Response } from "express";
import { AssetsService } from "./assets.service";
import {
  initUploadSchema,
  completeUploadSchema,
  assetIdSchema,
} from "./assets.schemas";
import { asyncHandler } from "../../utils/asyncHandler";

export class AssetsController {
  /**
   * POST /api/assets/init-upload
   * Initialize asset upload and get presigned URL
   */
  static initUpload = asyncHandler(async (req: Request, res: Response) => {
    const result = initUploadSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const response = await AssetsService.initUpload(result.data);
    res.status(200).json(response);
  });

  /**
   * POST /api/assets/complete-upload
   * Mark upload as complete and trigger optimization
   */
  static completeUpload = asyncHandler(async (req: Request, res: Response) => {
    const result = completeUploadSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const response = await AssetsService.completeUpload(result.data.assetId);
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /api/assets
   * List all assets for the studio
   */
  static listAssets = asyncHandler(async (req: Request, res: Response) => {
    const assets = await AssetsService.listAssets();
    res.status(200).json({ assets });
  });

  /**
   * DELETE /api/assets/:id
   * Delete asset by ID
   */
  static deleteAsset = asyncHandler(async (req: Request, res: Response) => {
    const paramResult = assetIdSchema.safeParse(req.params);

    if (!paramResult.success) {
      res.status(400).json({
        message: "Invalid asset ID",
        errors: paramResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const response = await AssetsService.deleteAsset(paramResult.data.id);
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Asset not found") {
        res.status(404).json({ message: error.message });
        return;
      }
      throw error;
    }
  });
}
