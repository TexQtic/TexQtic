import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';

/**
 * Rate Limiter - Shadow Mode Implementation
 *
 * Records login attempts and calculates rate limit violations without blocking.
 * This is SHADOW MODE - logs when threshold exceeded but does NOT return 429.
 *
 * Phase 2 (future): Enable blocking by returning isLimited: true
 */

/**
 * Hash a rate limit key (email + IP composite) for privacy
 * Uses SHA-256 to prevent storing raw email/IP combinations
 *
 * @param rawKey - Composite key (e.g., "email:ip" or just "email")
 * @returns SHA-256 hash as hex string
 */
export function hashRateLimitKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Record a rate limit attempt (shadow mode - always succeeds)
 *
 * Stores attempt in database with expiration timestamp.
 * Old attempts are automatically excluded by time-based queries.
 *
 * @param params - Attempt parameters
 * @param params.key - Hashed composite key (email + IP)
 * @param params.endpoint - Login endpoint path
 * @param params.realm - TENANT or ADMIN
 * @param params.windowMinutes - Time window for expiration calculation
 */
export async function recordAttempt(params: {
  key: string;
  endpoint: string;
  realm: 'TENANT' | 'ADMIN';
  windowMinutes: number;
}): Promise<void> {
  const { key, endpoint, realm, windowMinutes } = params;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

  try {
    await prisma.rateLimitAttempt.create({
      data: {
        key,
        endpoint,
        realm,
        expiresAt,
      },
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error('[Rate Limiter] Failed to record attempt:', error);
  }
}

/**
 * Get attempt count for a key within time window
 *
 * Queries database for non-expired attempts matching the key.
 * Used to determine if rate limit threshold is exceeded.
 *
 * @param params - Query parameters
 * @param params.key - Hashed composite key
 * @param params.windowMinutes - Time window to check
 * @returns Number of attempts in the window
 */
export async function getAttemptCount(params: {
  key: string;
  windowMinutes: number;
}): Promise<number> {
  const { key, windowMinutes } = params;

  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

  try {
    const count = await prisma.rateLimitAttempt.count({
      where: {
        key,
        createdAt: {
          gte: cutoffTime,
        },
      },
    });

    return count;
  } catch (error) {
    console.error('[Rate Limiter] Failed to get attempt count:', error);
    return 0; // Fail open - don't block on DB errors
  }
}

/**
 * Check if rate limit threshold is exceeded (shadow mode)
 *
 * Calculates current attempt count and compares to threshold.
 * Returns true if limit exceeded, but does NOT block requests.
 *
 * @param params - Check parameters
 * @param params.key - Hashed composite key
 * @param params.threshold - Maximum allowed attempts
 * @param params.windowMinutes - Time window
 * @returns true if threshold exceeded (for logging), false otherwise
 */
export async function isOverThreshold(params: {
  key: string;
  threshold: number;
  windowMinutes: number;
}): Promise<boolean> {
  const { key, threshold, windowMinutes } = params;

  const count = await getAttemptCount({ key, windowMinutes });

  return count >= threshold;
}

/**
 * Cleanup expired rate limit attempts (maintenance utility)
 *
 * Deletes old attempts that are past their expiration time.
 * Should be called periodically (e.g., via cron job) to prevent table bloat.
 *
 * This is a utility function, not used in hot path.
 */
export async function cleanupExpiredAttempts(): Promise<number> {
  try {
    const result = await prisma.rateLimitAttempt.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('[Rate Limiter] Failed to cleanup expired attempts:', error);
    return 0;
  }
}
