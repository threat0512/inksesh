import { prisma } from "../../db/prisma";
import type { InitUploadInput } from "./assets.schemas";
import { getPresignedPutUrl, getPresignedGetUrl, deleteFromS3 } from "../../integrations/s3";
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

    // Generate signed URLs for each asset and its variants
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const originalSignedUrl = await getPresignedGetUrl({
          key: asset.originalKey,
        });

        // Generate signed URLs for all variants
        const variantsWithUrls = await Promise.all(
          asset.variants.map(async (v) => {
            const url = await getPresignedGetUrl({ key: v.key });
            return {
              kind: v.kind,
              url,
              width: v.width,
              height: v.height,
              format: v.format,
              sizeBytes: v.sizeBytes,
            };
          })
        );

        return {
          id: asset.id,
          type: asset.type,
          mimeType: asset.mimeType,
          status: asset.status,
          originalSizeBytes: asset.originalSizeBytes,
          createdAt: asset.createdAt,
          originalSignedUrl,
          variants: variantsWithUrls,
        };
      })
    );

    return assetsWithUrls;
  }

  /**
   * Delete asset by ID
   */
  static async deleteAsset(id: string) {
    // Load asset with all variants
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    // Collect all S3 keys to delete
    const keysToDelete: string[] = [asset.originalKey];
    asset.variants.forEach((variant) => {
      keysToDelete.push(variant.key);
    });

    // Delete S3 objects
    const deletionResults = await Promise.allSettled(
      keysToDelete.map(async (key) => {
        try {
          await deleteFromS3({ key });
          console.log(`Deleted S3 object: ${key}`);
          return { key, success: true };
        } catch (error) {
          console.error(`Failed to delete S3 object: ${key}`, error);
          return { key, success: false, error };
        }
      })
    );

    // Check if any deletions failed
    const failures = deletionResults.filter(
      (result) => result.status === "rejected" || 
      (result.status === "fulfilled" && !result.value.success)
    );

    if (failures.length > 0) {
      console.warn(
        `Asset ${id}: ${failures.length}/${keysToDelete.length} S3 deletions failed. ` +
        `DB will still be cleaned up to keep UI consistent.`
      );
    } else {
      console.log(`All S3 objects deleted for asset ${id}`);
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id },
    });

    console.log(`Asset ${id} deleted from database`);

    return { ok: true };
  }
}
