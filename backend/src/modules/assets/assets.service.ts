import { prisma } from "../../db/prisma";
import type { InitUploadInput } from "./assets.schemas";
import { getPresignedPutUrl, getPresignedGetUrl } from "../../integrations/s3";
import { publishOptimizeAsset } from "../../queue/boss";

export class AssetsService {
  /**
   * Initialize asset upload - create DB record and return presigned upload URL
   */
  static async initUpload(data: InitUploadInput) {
    // Ensure studio exists (get or create)
    let studio = await prisma.studio.findFirst();

    if (!studio) {
      studio = await prisma.studio.create({
        data: {
          name: "My Studio",
          area: null,
          specialties: [],
        },
      });
    }

    // Create asset record
    const asset = await prisma.asset.create({
      data: {
        studioId: studio.id,
        type: data.type,
        mimeType: data.mimeType,
        originalKey: "", // Will be set below
        originalSizeBytes: data.sizeBytes ?? null,
        status: "UPLOADED",
      },
    });

    // Generate S3 key
    const originalKey = `studio/${studio.id}/assets/${asset.id}/original`;

    // Update asset with key
    await prisma.asset.update({
      where: { id: asset.id },
      data: { originalKey },
    });

    // Generate presigned PUT URL
    const uploadUrl = await getPresignedPutUrl({
      key: originalKey,
      contentType: data.mimeType,
    });

    return {
      assetId: asset.id,
      key: originalKey,
      uploadUrl,
    };
  }

  /**
   * Mark upload complete and enqueue optimization job
   */
  static async completeUpload(assetId: string) {
    // Update status to PROCESSING
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "PROCESSING" },
    });

    // Publish optimization job
    await publishOptimizeAsset(assetId);

    return { ok: true };
  }

  /**
   * List all assets for the studio
   */
  static async listAssets() {
    // Get studio
    const studio = await prisma.studio.findFirst();

    if (!studio) {
      return [];
    }

    // Get assets with variants
    const assets = await prisma.asset.findMany({
      where: { studioId: studio.id },
      orderBy: { createdAt: "desc" },
      include: {
        variants: true,
      },
    });

    // Generate signed URLs for each asset
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const originalSignedUrl = await getPresignedGetUrl({
          key: asset.originalKey,
        });

        return {
          id: asset.id,
          type: asset.type,
          mimeType: asset.mimeType,
          status: asset.status,
          originalSizeBytes: asset.originalSizeBytes,
          createdAt: asset.createdAt,
          originalSignedUrl,
          variants: asset.variants.map((v) => ({
            id: v.id,
            kind: v.kind,
            format: v.format,
            width: v.width,
            height: v.height,
            sizeBytes: v.sizeBytes,
          })),
        };
      })
    );

    return assetsWithUrls;
  }

  /**
   * Delete asset by ID
   */
  static async deleteAsset(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    // Delete from database (variants cascade)
    await prisma.asset.delete({
      where: { id },
    });

    // TODO: Delete S3 objects (originalKey + all variant keys)
    // Will implement in later phase

    return { ok: true };
  }
}
