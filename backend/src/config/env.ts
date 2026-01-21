import dotenv from "dotenv";
import { resolve } from "path";
import { z } from "zod";

// Load .env from workspace root (one level up from backend/)
dotenv.config({ path: resolve(process.cwd(), "../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.union([z.string(), z.coerce.number()]).default("7d"),
  CORS_ORIGIN: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  ASSET_URL_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
