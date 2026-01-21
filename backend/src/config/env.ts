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
  CORS_ORIGIN: z.string().min(1)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
