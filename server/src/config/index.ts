import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const optionalOpaqueTokenHash = z.string().trim().length(64).optional();

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
  APPROVED_ONBOARDING_SERVICE_TOKEN_HASH: optionalOpaqueTokenHash,
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Refresh Token TTL (in days)
  REFRESH_TOKEN_TTL_DAYS_TENANT: z.string().transform(Number).default('14'),
  REFRESH_TOKEN_TTL_DAYS_ADMIN: z.string().transform(Number).default('7'),

  // Rate Limiting (shadow mode)
  RATE_LIMIT_TENANT_LOGIN_MAX: z.string().transform(Number).default('5'),
  RATE_LIMIT_ADMIN_LOGIN_MAX: z.string().transform(Number).default('3'),
  RATE_LIMIT_WINDOW_MINUTES: z.string().transform(Number).default('10'),

  // AI
  GEMINI_API_KEY: z.string().min(1),

  // CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,https://www.texqtic.com,https://texqtic.com'),

  // G-026 — Domain resolver HMAC secret (≥ 32 chars).
  // Must be set in all environments. Shared with the Vercel Edge function.
  TEXQTIC_RESOLVER_SECRET: z.string().min(32),

  // Feature Flags
  KILL_SWITCH_ALL: z
    .string()
    .transform(v => v === 'true')
    .default('false'),

  // Email / SMTP (optional — service degrades gracefully if absent)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const _baseConfig = envSchema.parse(process.env);

// FRONTEND_URL — non-fatal: sanitize common Vercel mistakes (quote-wrapping,
// trailing whitespace) then safeParse so a bad value never takes down the API.
const _frontendUrlRaw = process.env.FRONTEND_URL;
const _frontendUrlClean = _frontendUrlRaw
  ?.trim()
  .replace(/^"|"$/g, '')
  .replace(/^'|'$/g, '');

const _parsedFrontendUrl = z.string().url().safeParse(_frontendUrlClean);

const FRONTEND_URL_VALUE = _parsedFrontendUrl.success
  ? _parsedFrontendUrl.data
  : 'https://www.texqtic.com';

if (!_parsedFrontendUrl.success) {
  console.warn('[config] FRONTEND_URL invalid/missing; using fallback https://www.texqtic.com', {
    value: _frontendUrlRaw,
  });
}

export const config = { ..._baseConfig, FRONTEND_URL: FRONTEND_URL_VALUE };

export type Config = z.infer<typeof envSchema> & { FRONTEND_URL: string };
