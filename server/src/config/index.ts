import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ADMIN_ACCESS_SECRET: z.string().min(32),
  JWT_ADMIN_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // AI
  GEMINI_API_KEY: z.string().min(1),

  // CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,https://www.texqtic.com,https://texqtic.com'),

  // Feature Flags
  KILL_SWITCH_ALL: z
    .string()
    .transform(v => v === 'true')
    .default('false'),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
