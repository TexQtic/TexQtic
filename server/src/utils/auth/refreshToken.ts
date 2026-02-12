import { randomBytes, createHash, randomUUID } from 'node:crypto';

/**
 * Generates a cryptographically secure opaque refresh token
 * Format: 64 random bytes encoded as base64url (no padding)
 * @returns Plaintext refresh token (to be sent to client)
 */
export function generateRefreshToken(): string {
  const buffer = randomBytes(64);
  return buffer.toString('base64url'); // URL-safe, no padding
}

/**
 * Hashes a refresh token using SHA-256
 * This hash is stored in the database for secure verification
 * @param token - Plaintext refresh token
 * @returns SHA-256 hash as hex string
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a refresh session payload for database insertion
 * Enforces realm isolation: exactly one of userId or adminId must be provided
 *
 * @param params - Session parameters
 * @param params.userId - Tenant user ID (for tenant realm)
 * @param params.adminId - Admin user ID (for admin realm)
 * @param params.tokenHash - SHA-256 hash of the refresh token
 * @param params.familyId - Token family ID for rotation tracking (optional, generates new UUID if not provided)
 * @param params.expiresAt - Token expiration timestamp
 * @param params.ip - Client IP address (optional)
 * @param params.userAgent - Client user agent (optional)
 * @returns Prisma create payload for RefreshToken model
 * @throws Error if realm constraint is violated (both or neither userId/adminId provided)
 */
export function createRefreshSession(params: {
  userId?: string;
  adminId?: string;
  tokenHash: string;
  familyId?: string;
  expiresAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { userId, adminId, tokenHash, familyId, expiresAt, ip, userAgent } = params;

  // Realm isolation constraint: exactly one of userId or adminId must be set
  if ((userId && adminId) || (!userId && !adminId)) {
    throw new Error(
      'RefreshToken realm constraint violation: exactly one of userId or adminId must be provided'
    );
  }

  return {
    id: randomUUID(),
    userId: userId ?? null,
    adminId: adminId ?? null,
    tokenHash,
    familyId: familyId ?? randomUUID(), // Generate new family if not provided
    expiresAt,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
  };
}

/**
 * Rotation data for atomically rotating a refresh token
 *
 * This helper generates the payload for rotating a refresh token during refresh operations.
 * The old token should be marked as rotated, and a new token should be created in the same family.
 *
 * Rotation strategy:
 * 1. Mark old token as rotated (set rotatedAt timestamp)
 * 2. Create new token with same familyId
 * 3. Both operations must happen in a transaction
 *
 * @param params - Rotation parameters
 * @param params.oldTokenHash - Hash of the token being rotated
 * @param params.newTokenHash - Hash of the new token
 * @param params.familyId - Token family ID (inherited from old token)
 * @param params.userId - User ID (inherited from old token)
 * @param params.adminId - Admin ID (inherited from old token)
 * @param params.expiresAt - New token expiration
 * @param params.ip - Client IP (optional)
 * @param params.userAgent - Client user agent (optional)
 * @returns Object with oldTokenUpdate (to mark as rotated) and newTokenData (to create)
 */
export function rotateRefreshSession(params: {
  oldTokenHash: string;
  newTokenHash: string;
  familyId: string;
  userId?: string;
  adminId?: string;
  expiresAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { oldTokenHash, newTokenHash, familyId, userId, adminId, expiresAt, ip, userAgent } =
    params;

  // Realm constraint validation
  if ((userId && adminId) || (!userId && !adminId)) {
    throw new Error(
      'RefreshToken realm constraint violation: exactly one of userId or adminId must be provided'
    );
  }

  return {
    oldTokenUpdate: {
      where: { tokenHash: oldTokenHash },
      data: {
        rotatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
    newTokenData: {
      id: randomUUID(),
      userId: userId ?? null,
      adminId: adminId ?? null,
      tokenHash: newTokenHash,
      familyId, // Same family as the old token
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  };
}
