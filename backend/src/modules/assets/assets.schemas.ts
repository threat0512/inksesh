import { z } from "zod";

export const initUploadSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export const completeUploadSchema = z.object({
  assetId: z.string().uuid("Invalid asset ID"),
});

export const assetIdSchema = z.object({
  id: z.string().uuid("Invalid asset ID"),
});

export type InitUploadInput = z.infer<typeof initUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type AssetIdInput = z.infer<typeof assetIdSchema>;
