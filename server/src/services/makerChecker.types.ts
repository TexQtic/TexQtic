/**
 * G-021 — MakerCheckerService Types
 * Doctrine v1.4 + G-021 Design v1.1 + D-021-A/B/C directives
 *
 * Public API contract for MakerCheckerService — types only, no DB imports.
 * All methods return typed result objects; none throw except on programmer error.
 */

import type { EntityType, ActorType } from './stateMachine.types.js';

export type { EntityType, ActorType };

// ─── Canonical Signer Actor Types ─────────────────────────────────────────────

/**
 * D-021-C / §3.B: Only these actor types may sign an approval.
 * SYSTEM_AUTOMATION and TENANT_USER are permanently disallowed at DB CHECK level.
 * AI is not an actor type — cannot appear here.
 */
export type SignerActorType = 'CHECKER' | 'PLATFORM_ADMIN';

// ─── Approval Request Status ───────────────────────────────────────────────────

export type ApprovalStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ESCALATED';

// ─── Signature Decision ────────────────────────────────────────────────────────

export type SignatureDecision = 'APPROVE' | 'REJECT';

// ─── Input Types ───────────────────────────────────────────────────────────────

/**
 * Input to MakerCheckerService.createApprovalRequest().
 * Called by the route layer or another service after StateMachineService
 * returns { status: 'PENDING_APPROVAL' }.
 */
export type CreateApprovalRequestInput = {
  /** Org boundary — must match RLS context. */
  orgId: string;
  entityType: EntityType;
  /** UUID of the entity being transitioned. Soft reference. */
  entityId: string;
  /** Normalized (uppercase) from state key at request time. */
  fromStateKey: string;
  /** Normalized (uppercase) to state key at request time. */
  toStateKey: string;
  /** Maker's actor type. SYSTEM_AUTOMATION is forbidden (DB CHECK enforces). */
  requestedByActorType: ActorType;
  /** UUID of the user submitting the request. Exclusive of requestedByAdminId. */
  requestedByUserId?: string | null;
  /** UUID of the admin submitting the request. Exclusive of requestedByUserId. */
  requestedByAdminId?: string | null;
  /** Role snapshot at Maker request time. */
  requestedByRole: string;
  /** Maker's justification. Non-empty. */
  requestReason: string;
  /** Full original TransitionRequest JSON (minus secrets) for D-021-A hash + replay. */
  frozenPayload: Record<string, unknown>;
  /** Severity level (1–4) used to compute expires_at TTL. */
  severityLevel: number;
  /** From TransitionRequest.aiTriggered. */
  aiTriggered?: boolean;
  /** ImpersonationSession UUID if Maker was acting via impersonation. */
  impersonationId?: string | null;
  /** Fastify request ID correlation. */
  requestId?: string | null;
};

/**
 * Input to MakerCheckerService.signApproval().
 * Called by a Checker principal who has reviewed the Maker's request.
 */
export type SignApprovalInput = {
  /** UUID of the pending_approvals record to sign. */
  approvalId: string;
  /** Org context — must match pending_approvals.org_id (optional when service reads from row). */
  orgId?: string;
  decision: SignatureDecision;
  reason: string;
  signerActorType: SignerActorType;
  /** UUID of the signing user. Exclusive of signerAdminId. */
  signerUserId?: string | null;
  /** UUID of the signing admin. Exclusive of signerUserId. */
  signerAdminId?: string | null;
  signerRole: string;
  /** If signing during impersonation. */
  impersonationId?: string | null;
};

/**
 * Input to MakerCheckerService.verifyAndReplay().
 * Fetches an APPROVED pending_approval, validates D-021-A hash, then
 * replays the transition through StateMachineService with CHECKER actor.
 */
export type VerifyAndReplayInput = {
  approvalId: string;
  /** Org context for RLS — optional when fetching by approvalId in service context. */
  orgId?: string;
};

// ─── Result Types ──────────────────────────────────────────────────────────────

export type CreateApprovalResult =
  | { status: 'CREATED'; approvalId: string; expiresAt: Date }
  | { status: 'ACTIVE_REQUEST_EXISTS'; code: ApprovalErrorCode; message: string }
  | { status: 'ERROR'; code: ApprovalErrorCode; message: string };

export type SignApprovalResult =
  | { status: 'APPROVED'; approvalId: string; decision: 'APPROVE' }
  | { status: 'REJECTED'; approvalId: string; decision: 'REJECT' }
  | { status: 'ERROR'; code: ApprovalErrorCode; message: string };

export type VerifyReplayResult =
  | { status: 'APPLIED'; approvalId: string }
  | { status: 'ERROR'; code: ApprovalErrorCode; message: string };

// ─── Error Codes ───────────────────────────────────────────────────────────────

/**
 * Typed error codes for MakerCheckerService results.
 * Stable API — do not rename without migrating callers.
 */
export type ApprovalErrorCode =
  /** D-021-C: Maker and Checker are the same principal. DB trigger P0002 fires. */
  | 'MAKER_CHECKER_SAME_PRINCIPAL'
  /** TTL has elapsed — approval cannot be signed or replayed. */
  | 'APPROVAL_EXPIRED'
  /** Approval is not in REQUESTED state — cannot be signed. */
  | 'APPROVAL_NOT_ACTIVE'
  /** Approval is not in APPROVED state — cannot replay. */
  | 'APPROVAL_NOT_APPROVED'
  /** D-021-A: Replayed fields do not match stored frozen_payload_hash. */
  | 'PAYLOAD_INTEGRITY_VIOLATION'
  /** pending_approvals record not found for the given org. */
  | 'APPROVAL_NOT_FOUND'
  /** Principal exclusivity violated (both or neither user/admin IDs set). */
  | 'PRINCIPAL_EXCLUSIVITY_VIOLATION'
  /** StateMachineService returned DENIED during replay. */
  | 'REPLAY_TRANSITION_DENIED'
  /** DB constraint error not covered by the above. */
  | 'DB_ERROR';

// ─── Internal Row Shapes ───────────────────────────────────────────────────────

/**
 * Shape of a pending_approvals row as returned by Prisma.
 * Used internally by the service — not exposed to callers.
 */
export type PendingApprovalRow = {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  fromStateKey: string;
  toStateKey: string;
  requestedByUserId: string | null;
  requestedByAdminId: string | null;
  requestedByActorType: string;
  requestedByRole: string;
  requestReason: string;
  status: string;
  expiresAt: Date;
  frozenPayloadHash: string;
  makerPrincipalFingerprint: string;
  frozenPayload: unknown;
  attemptCount: number;
  escalationId: string | null;
  aiTriggered: boolean;
  impersonationId: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Shape of an approval_signatures row as returned by Prisma.
 */
export type ApprovalSignatureRow = {
  id: string;
  approvalId: string;
  orgId: string;
  signerUserId: string | null;
  signerAdminId: string | null;
  signerActorType: string;
  signerRole: string;
  decision: string;
  reason: string;
  impersonationId: string | null;
  createdAt: Date;
};
