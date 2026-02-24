/**
 * G-021 — MakerCheckerService Guardrails
 * D-021-A: Frozen payload integrity hash computation
 * D-021-C: Maker principal fingerprint derivation
 *
 * All functions are pure / synchronous — no DB, no side effects.
 * Fully testable in isolation.
 */

import { createHash } from 'node:crypto';
import type { CreateApprovalRequestInput } from './makerChecker.types.js';

// ─── D-021-A: Frozen Payload Hash ─────────────────────────────────────────────

/**
 * Canonical hash input field order (MUST NOT be changed — changing this breaks
 * all replay validation for existing pending_approvals records).
 *
 * Fields (from §10.1 of G-021_MAKER_CHECKER_DESIGN.md):
 *   entity_type | entity_id | from_state_key | to_state_key
 *   | requested_by_actor_type | principal_id | requested_by_role | request_reason
 *
 * principal_id = requestedByUserId ?? requestedByAdminId
 * All fields are trimmed; state keys are uppercased; the rest are as-is.
 *
 * Returns a 64-character lowercase SHA-256 hex string.
 */
export function computePayloadHash(input: CreateApprovalRequestInput): string {
  const principalId = input.requestedByUserId ?? input.requestedByAdminId ?? '';
  const canonical = [
    input.entityType,
    input.entityId.toLowerCase(),
    input.fromStateKey.toUpperCase().trim(),
    input.toStateKey.toUpperCase().trim(),
    input.requestedByActorType.toUpperCase(),
    principalId.toLowerCase(),
    input.requestedByRole.trim(),
    input.requestReason.trim(), // NOT normalized — reason is part of intent
  ].join('|');

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Recompute the canonical hash from individual fields (for replay validation).
 * Accepts the same fields as computePayloadHash but as explicit parameters
 * to make it clear which fields are hashed at replay time.
 *
 * Used in MakerCheckerService.verifyAndReplay() to compare against
 * pending_approvals.frozen_payload_hash.
 */
export function recomputePayloadHash(fields: {
  entityType: string;
  entityId: string;
  fromStateKey: string;
  toStateKey: string;
  requestedByActorType: string;
  /** requestedByUserId ?? requestedByAdminId */
  principalId: string;
  requestedByRole: string;
  requestReason: string;
}): string {
  const canonical = [
    fields.entityType,
    fields.entityId.toLowerCase(),
    fields.fromStateKey.toUpperCase().trim(),
    fields.toStateKey.toUpperCase().trim(),
    fields.requestedByActorType.toUpperCase(),
    fields.principalId.toLowerCase(),
    fields.requestedByRole.trim(),
    fields.requestReason.trim(),
  ].join('|');

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verify that a recomputed hash matches the stored hash.
 * Returns { valid: true } or { valid: false, computed, stored } for debugging.
 *
 * Constant-time comparison is NOT used here because the hash is not a secret;
 * it is a governance integrity check, not a cryptographic secret comparison.
 */
export function verifyPayloadHash(
  computedHash: string,
  storedHash: string,
): { valid: boolean; computed: string; stored: string } {
  return {
    valid: computedHash === storedHash,
    computed: computedHash,
    stored: storedHash,
  };
}

// ─── D-021-C: Maker Principal Fingerprint ─────────────────────────────────────

/**
 * Derive the opaque maker principal fingerprint stored in pending_approvals.
 *
 * Format: "{requestedByActorType}:{principalId}"
 *
 * Examples:
 *   "TENANT_USER:a1b2c3d4-e5f6-..."
 *   "PLATFORM_ADMIN:f9e8d7c6-..."
 *   "MAKER:a1b2c3d4-..."
 *
 * This fingerprint is also computed by the DB trigger `check_maker_checker_separation`
 * for the signer, and compared against this stored value to enforce Maker ≠ Checker
 * at the DB layer (D-021-C).
 *
 * The trigger's version: `NEW.signer_actor_type || ':' || COALESCE(signer_user_id, signer_admin_id)`
 * The service's version (this function): same format, applied to the Maker.
 */
export function computeMakerFingerprint(input: CreateApprovalRequestInput): string {
  const principalId = input.requestedByUserId ?? input.requestedByAdminId ?? '';
  if (!principalId) {
    // SYSTEM_AUTOMATION: no principal ID. Should be blocked by DB CHECK before reaching this,
    // but guard defensively.
    throw new Error(
      'MAKER_FINGERPRINT_ERROR: both requestedByUserId and requestedByAdminId are null. ' +
        'SYSTEM_AUTOMATION is not permitted to create approval requests.',
    );
  }
  return `${input.requestedByActorType}:${principalId}`;
}

/**
 * Derive the signer fingerprint for comparison in the service layer.
 * Must produce the same format as the DB trigger `check_maker_checker_separation`.
 */
export function computeSignerFingerprint(
  signerActorType: string,
  signerUserId: string | null | undefined,
  signerAdminId: string | null | undefined,
): string {
  const principalId = signerUserId ?? signerAdminId ?? '';
  return `${signerActorType}:${principalId}`;
}

// ─── TTL Computation ────────────────────────────────────────────────────────────

/**
 * Compute expires_at based on severity level (§2.3 of design doc).
 *
 * TTL table:
 *   severity 1–2: 24 hours (standard)
 *   severity 3:    4 hours (high-risk)
 *   severity 4:    1 hour  (compliance/critical)
 *   severity 0:   48 hours (default / platform-level)
 */
export function computeExpiresAt(severityLevel: number, fromDate: Date = new Date()): Date {
  const ttlHours =
    severityLevel >= 4 ? 1 :
    severityLevel === 3 ? 4 :
    severityLevel >= 1 ? 24 :
    48; // severity 0 = platform-level, longer window

  const expiresAt = new Date(fromDate);
  expiresAt.setHours(expiresAt.getHours() + ttlHours);
  return expiresAt;
}

/**
 * Check if an approval record has expired.
 * Returns true if already past the expiry time.
 */
export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now >= expiresAt;
}
