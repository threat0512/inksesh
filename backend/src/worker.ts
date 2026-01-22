import { PgBoss } from "pg-boss";
import sharp from "sharp";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ffmpegPath from "ffmpeg-static";
import { getBoss, startBoss } from "./queue/boss";
import { OPTIMIZE_ASSET } from "./queue/jobNames";
import { prisma } from "./db/prisma";
import { downloadFromS3, uploadToS3 } from "./integrations/s3";

/**
 * Variant specifications for image optimization
 */
const VARIANT_SPECS = [
  { width: 200, kind: "thumb" },
  { width: 800, kind: "card" },
  { width: 1600, kind: "full" },
] as const;

/**
 * Process image optimization job
 */
async function optimizeImage(assetId: string): Promise<void> {
  console.log(`Starting optimization for asset: ${assetId}`);

  // Load asset from database
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { variants: true },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // Skip if not an image
  if (asset.type !== "IMAGE") {
    console.log(`Skipping non-image asset (type: ${asset.type})`);
    return;
  }

  // Check if already processed (idempotency - optional short-circuit)
  if (asset.status === "READY" && asset.variants.length >= VARIANT_SPECS.length) {
    console.log(`Asset already optimized, skipping`);
    return;
  }

  try {
    // Download original from S3
    console.log(`Downloading original from S3: ${asset.originalKey}`);
    const originalBuffer = await downloadFromS3({ key: asset.originalKey });

    console.log(`Downloaded ${originalBuffer.length} bytes`);

    // Try to load the image to check if Sharp supports it
    let inputImage;
    try {
      inputImage = sharp(originalBuffer);
      await inputImage.metadata();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('heif') || errorMsg.includes('HEIC')) {
        throw new Error('HEIC/HEIF format not supported. Please convert to JPEG, PNG, or WebP before uploading.');
      }
      throw error; // Re-throw other errors
    }

    // Process each variant
    for (const spec of VARIANT_SPECS) {
      console.log(`🔄 Processing ${spec.kind} variant (width: ${spec.width}px)...`);

      // Generate optimized image
      // steps - rotate, resize, webp
      // 1. rotate
      // 2. resize
      // 3. webp
      // 4. metadata
      // 5. upload to S3
      // 6. upsert variant in database

      const pipeline = sharp(originalBuffer)
        .rotate()
        .resize({ width: spec.width, withoutEnlargement: true })
        .webp({ quality: 75 });

      const outputBuffer = await pipeline.toBuffer();
      const metadata = await sharp(outputBuffer).metadata();

      // Upload to S3
      const variantKey = `studio/${asset.studioId}/assets/${assetId}/w${spec.width}.webp`;
      console.log(`Uploading ${spec.kind} to S3: ${variantKey}`);

      await uploadToS3({
        key: variantKey,
        buffer: outputBuffer,
        contentType: "image/webp",
      });

      // Upsert variant in database
      await prisma.assetVariant.upsert({
        where: {
          assetId_kind: {
            assetId: assetId,
            kind: spec.kind,
          },
        },
        create: {
          assetId: assetId,
          kind: spec.kind,
          key: variantKey,
          format: "webp",
          width: metadata.width || null,
          height: metadata.height || null,
          sizeBytes: outputBuffer.length,
        },
        update: {
          key: variantKey,
          format: "webp",
          width: metadata.width || null,
          height: metadata.height || null,
          sizeBytes: outputBuffer.length,
        },
      });

      console.log(
        `${spec.kind}: ${metadata.width}x${metadata.height}, ${outputBuffer.length} bytes`
      );
    }

    // Mark asset as READY
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "READY" },
    });

    console.log(`Asset optimization complete: ${assetId}`);
  } catch (error) {
    console.error(`Optimization failed for ${assetId}:`, error);

    // Mark asset as FAILED
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "FAILED" },
    });

    // Rethrow to let pg-boss handle retry
    throw error;
  }
}

/**
 * Process video optimization job - generate poster thumbnail
 */
async function optimizeVideo(assetId: string): Promise<void> {
  console.log(`Starting video optimization for asset: ${assetId}`);

  // Load asset from database
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { variants: true },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // Skip if not a video
  if (asset.type !== "VIDEO") {
    console.log(`Skipping non-video asset (type: ${asset.type})`);
    return;
  }

  // Check if already processed (idempotency)
  if (asset.status === "READY" && asset.variants.some((v) => v.kind === "poster")) {
    console.log(`Video already has poster, skipping`);
    return;
  }

  const videoTempPath = join(tmpdir(), `video-${assetId}-${Date.now()}.tmp`);
  const posterTempPath = join(tmpdir(), `poster-${assetId}-${Date.now()}.webp`);

  try {
    // Download original video from S3 to temp file
    console.log(`Downloading video from S3: ${asset.originalKey}`);
    const videoBuffer = await downloadFromS3({ key: asset.originalKey });
    await writeFile(videoTempPath, videoBuffer);
    console.log(`Downloaded video ${videoBuffer.length} bytes to ${videoTempPath}`);

    // Generate poster frame at 1 second using ffmpeg
    console.log(`Generating poster frame...`);
    await generatePosterFrame(videoTempPath, posterTempPath);

    // Read poster file
    const posterBuffer = await sharp(posterTempPath).toBuffer();
    const posterMetadata = await sharp(posterBuffer).metadata();
    console.log(`Poster generated: ${posterMetadata.width}x${posterMetadata.height}`);

    // Upload poster to S3
    const posterKey = `studio/${asset.studioId}/assets/${assetId}/poster.webp`;
    console.log(`Uploading poster to S3: ${posterKey}`);
    await uploadToS3({
      key: posterKey,
      buffer: posterBuffer,
      contentType: "image/webp",
    });

    // Upsert poster variant in database
    await prisma.assetVariant.upsert({
      where: {
        assetId_kind: {
          assetId: assetId,
          kind: "poster",
        },
      },
      create: {
        assetId: assetId,
        kind: "poster",
        key: posterKey,
        format: "webp",
        width: posterMetadata.width || null,
        height: posterMetadata.height || null,
        sizeBytes: posterBuffer.length,
      },
      update: {
        key: posterKey,
        format: "webp",
        width: posterMetadata.width || null,
        height: posterMetadata.height || null,
        sizeBytes: posterBuffer.length,
      },
    });

    console.log(`Poster variant created: ${posterMetadata.width}x${posterMetadata.height}, ${posterBuffer.length} bytes`);

    // Mark video as READY
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "READY" },
    });

    console.log(`Video optimization complete: ${assetId}`);
  } catch (error) {
    console.error(`Video optimization failed for ${assetId}:`, error);

    // Mark asset as FAILED
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "FAILED" },
    });

    // Rethrow to let pg-boss handle retry
    throw error;
  } finally {
    // Clean up temp files
    try {
      await unlink(videoTempPath);
      console.log(`Cleaned up temp video file`);
    } catch (err) {
      // Ignore cleanup errors
    }
    try {
      await unlink(posterTempPath);
      console.log(`Cleaned up temp poster file`);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate poster frame from video using ffmpeg
 */
function generatePosterFrame(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path not found"));
      return;
    }

    const args = [
      "-ss", "1",                    // Seek to 1 second
      "-i", inputPath,               // Input file
      "-frames:v", "1",              // Extract 1 frame
      "-vf", "scale=800:-1",         // Scale to 800px width, maintain aspect ratio
      "-y",                          // Overwrite output file
      outputPath,                    // Output file
    ];

    console.log(`Running ffmpeg: ${ffmpegPath} ${args.join(" ")}`);

    const ffmpeg = spawn(ffmpegPath, args);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Worker process for background jobs
 */
async function startWorker() {
  // Start pg-boss
  await startBoss();

  const boss = getBoss();

  // Add error handler for unhandled errors
  boss.on("error", (error) => {
    console.error("Worker error:", error);
  });

  // Create the queue if it doesn't exist
  try {
    await boss.createQueue(OPTIMIZE_ASSET);
    console.log(`Queue "${OPTIMIZE_ASSET}" ready`);
  } catch (error) {
    console.log(`Queue "${OPTIMIZE_ASSET}" may already exist`);
  }

  // Register optimize asset job handler
  await boss.work(OPTIMIZE_ASSET, async (jobs: any) => {
    // pg-boss passes jobs as an array
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    
    console.log("Optimize asset job received:", job.data);

    if (!job || !job.data) {
      console.error("No job or job.data");
      return;
    }

    const { assetId } = job.data;

    if (!assetId) {
      console.error("No assetId in job data");
      return;
    }

    try {
      // Load asset to determine type
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { type: true },
      });

      if (!asset) {
        console.error(`Asset not found: ${assetId}`);
        return;
      }

      // Process based on asset type
      if (asset.type === "IMAGE") {
        await optimizeImage(assetId);
      } else if (asset.type === "VIDEO") {
        await optimizeVideo(assetId);
      } else {
        console.error(`Unknown asset type: ${asset.type}`);
      }
    } catch (error) {
      console.error("Job failed:", error);
      throw error;
    }
  });

  console.log("Worker started and listening for jobs");
}

startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
