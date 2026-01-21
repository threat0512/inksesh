import { PgBoss } from "pg-boss";
import { env } from "../config/env";
import { OPTIMIZE_ASSET } from "./jobNames";

let bossInstance: PgBoss | null = null;

/**
 * Get singleton pg-boss instance
 */
export function getBoss(): PgBoss {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      application_name: "inksesh-boss",
    });
  }
  return bossInstance;
}

/**
 * Start pg-boss queue system
 */
export async function startBoss(): Promise<void> {
  const boss = getBoss();
  
  // Add error handler to prevent unhandled error crashes
  boss.on("error", (error) => {
    console.error("pg-boss error:", error);
  });
  
  await boss.start();
  console.log("✓ pg-boss queue started");
}

/**
 * Publish optimize asset job
 */
export async function publishOptimizeAsset(assetId: string): Promise<void> {
  const boss = getBoss();
  await boss.send(OPTIMIZE_ASSET, { assetId });
}
