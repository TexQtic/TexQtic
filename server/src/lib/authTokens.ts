import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';

/**
 * Auth Token Utilities
 *
 * Provides helper functions for password reset and email verification tokens:
 * - Password reset: stored tokens (bcrypt hashed) with 30-minute expiry
 * - Email verification: JWT-based tokens (self-contained, no storage)
 */

/**
 * Generates a secure random token (32 bytes = 64 hex chars)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using bcrypt (for secure storage)
 */
export async function hashToken(token: string): Promise<string> {
  return await bcrypt.hash(token, 10);
}

/**
 * Verifies a token against its hash
 */
export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(token, hash);
}

/**
 * Generates a JWT-based email verification token (30-minute expiry)
 * Uses tenant JWT namespace for consistency
 */
export async function generateEmailVerificationToken(
  fastify: FastifyInstance,
  userId: string,
  email: string
): Promise<string> {
  // Use tenant JWT signing with special payload for verification
  // @ts-expect-error - fastify-jwt namespace creates 'tenant' property
  return await fastify.tenant.sign(
    {
      userId,
      email,
      purpose: 'email_verification',
    },
    {
      expiresIn: '30m',
    }
  );
}

/**
 * Verifies an email verification JWT token
 * Returns userId and email if valid, null if invalid/expired
 */
export async function verifyEmailVerificationToken(
  fastify: FastifyInstance,
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    // @ts-expect-error - fastify-jwt namespace creates 'tenant' property
    const decoded = await fastify.tenant.verify<{
      userId: string;
      email: string;
      purpose: string;
    }>(token);

    // Validate token purpose
    if (decoded.purpose !== 'email_verification') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch {
    return null; // Token invalid/expired
  }
}

/**
 * Password reset token expiry duration (30 minutes)
 */
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

/**
 * Calculates password reset token expiry timestamp
 */
export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
}
