/**
 * G-022 — EscalationService Types
 * Design: docs/governance/G-022_ESCALATION_DESIGN.md v1.1 (APPROVED 2026-02-24)
 * Directives: D-022-A · D-022-B · D-022-C · D-022-D
 *
 * Public API contract for EscalationService — types only, no DB imports.
 * All methods return typed result objects; none throw except where explicitly noted
 * (checkEntityFreeze / checkOrgFreeze throw GovError on freeze detection).
 */

// ─── Entity + Actor Types ──────────────────────────────────────────────────────

/**
 * Entity types that can be escalated.
 * ORG and GLOBAL are scope-level (not individual entity) escalation targets.
 */
export type EscalationEntityType =
  | 'TRADE'
  | 'ESCROW'
  | 'APPROVAL'
  | 'LIFECYCLE_LOG'
  | 'ORG'
  | 'GLOBAL'
  | 'CERTIFICATION';

/**
 * Who may initiate an escalation event.
 * SYSTEM_AUTOMATION is restricted to LEVEL_0 and LEVEL_1 only (service layer enforcement).
 * AI does not appear here — AI has no escalation authority.
 */
export type EscalationActorType =
  | 'PLATFORM_ADMIN'
  | 'TENANT_ADMIN'
  | 'SYSTEM_AUTOMATION'
  | 'SERVICE_LAYER';

/**
 * Source of the escalation event.
 * Identifies which subsystem generated the escalation.
 */
export type EscalationSource =
  | 'STATE_MACHINE'
  | 'APPROVAL'
  | 'MANUAL'
  | 'SYSTEM';

/**
 * Severity levels (0–4).
 *   0 = Informational   — no blocking
 *   1 = Review Required — no blocking, SLA required
 *   2 = High Risk       — service-layer soft block
 *   3 = Critical        — entity-level hard freeze
 *   4 = Platform Freeze Candidate — scope-wide freeze, dual-signature required
 *
 * Severity is strictly monotonic within an upgrade chain (D-022-A).
 */
export type EscalationSeverityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Status of an escalation event.
 * Transitions: OPEN → RESOLVED or OPEN → OVERRIDDEN. Never reversed.
 * All rows are append-only; status cannot be mutated after INSERT.
 */
export type EscalationStatus = 'OPEN' | 'RESOLVED' | 'OVERRIDDEN';

// ─── Input Types ───────────────────────────────────────────────────────────────

/**
 * Input to EscalationService.createEscalation().
 * Creates a root-level escalation event (no parent_escalation_id).
 */
export type CreateEscalationInput = {
  /** Org boundary — must match RLS context for tenant-scoped escalations. */
  orgId: string;
  entityType: EscalationEntityType;
  /** UUID of the escalated entity. For ORG: set to org_id. For GLOBAL: sentinel UUID. */
  entityId: string;
  source: EscalationSource;
  severityLevel: EscalationSeverityLevel;
  triggeredByActorType: EscalationActorType;
  triggeredByPrincipal: string;
  reason: string;
  /**
   * D-022-C: If true, sets freeze_recommendation=true on the row.
   * Only meaningful for entity_type='GLOBAL' LEVEL_4 events.
   * Has zero automated side effects — informational only.
   */
  freezeRecommendation?: boolean;
};

/**
 * Input to EscalationService.upgradeEscalation().
 * Creates a new escalation event that upgrades the severity of an existing OPEN event.
 * D-022-A: new.severity_level must be strictly greater than parent.severity_level.
 * DB trigger trg_escalation_severity_upgrade enforces this at the DB layer.
 */
export type UpgradeEscalationInput = {
  /** UUID of the existing OPEN escalation event to upgrade. */
  parentEscalationId: string;
  /** Must be strictly greater than the parent's severity_level (D-022-A). */
  severityLevel: EscalationSeverityLevel;
  triggeredByActorType: EscalationActorType;
  triggeredByPrincipal: string;
  reason: string;
  source: EscalationSource;
};

/**
 * Input to EscalationService.resolveEscalation().
 * Creates a RESOLVED row. The original row is NOT mutated (append-only).
 * Resolution row records who resolved, why, and when.
 *
 * Note: Resolution itself is a new INSERT — the original OPEN row is never updated.
 * This is a service-layer concern; the DB INSERT sets status='RESOLVED' directly.
 */
export type ResolveEscalationInput = {
  /** UUID of the OPEN escalation event to resolve. */
  escalationEventId: string;
  resolvedByPrincipal: string;
  resolutionReason: string;
};

/**
 * Input to EscalationService.overrideEscalation().
 * D-022-D: Override path — records OVERRIDDEN resolution row.
 * Requires escalation level >= 2 and explicit reason.
 * Does NOT bypass Maker-Checker if entity originally required it (D-022-D two paths).
 */
export type OverrideEscalationInput = {
  /** UUID of the OPEN escalation event to override (must be severity_level >= 2). */
  escalationEventId: string;
  resolvedByPrincipal: string;
  /** Mandatory — non-null, non-empty (D-022-D). */
  resolutionReason: string;
};

// ─── Result Types ──────────────────────────────────────────────────────────────

export type EscalationErrorCode =
  /** Escalation event not found by the given ID. */
  | 'ESCALATION_NOT_FOUND'
  /** Escalation event is not in OPEN status — cannot upgrade, resolve, or override. */
  | 'ESCALATION_NOT_OPEN'
  /**
   * D-022-A: new.severity_level <= parent.severity_level.
   * Severity may only be upgraded, never maintained or downgraded.
   */
  | 'SEVERITY_DOWNGRADE_FORBIDDEN'
  /**
   * D-022-D: override attempted on severity_level < 2.
   * Override path is only available for escalations >= LEVEL_2.
   */
  | 'OVERRIDE_LEVEL_TOO_LOW'
  /**
   * D-022-D: override attempted without escalation event ID.
   * Operator override requires an existing OPEN escalation record.
   */
  | 'OVERRIDE_NO_ESCALATION_RECORD'
  /** D-022-A: DB trigger fired — [E-022-SEVERITY-DOWNGRADE] or [E-022-PARENT-NOT-OPEN]. */
  | 'DB_TRIGGER_VIOLATION'
  /** General DB error not covered by the above. */
  | 'DB_ERROR';

export type CreateEscalationResult =
  | { status: 'CREATED'; escalationEventId: string; createdAt: Date }
  | { status: 'ERROR'; code: EscalationErrorCode; message: string };

export type UpgradeEscalationResult =
  | { status: 'UPGRADED'; escalationEventId: string; createdAt: Date }
  | { status: 'ERROR'; code: EscalationErrorCode; message: string };

export type ResolveEscalationResult =
  | { status: 'RESOLVED'; escalationEventId: string }
  | { status: 'ERROR'; code: EscalationErrorCode; message: string };

export type OverrideEscalationResult =
  | { status: 'OVERRIDDEN'; escalationEventId: string }
  | { status: 'ERROR'; code: EscalationErrorCode; message: string };

// ─── GovError ─────────────────────────────────────────────────────────────────

/**
 * Thrown by checkEntityFreeze() and checkOrgFreeze() when a freeze is active.
 * Callers (StateMachineService, MakerCheckerService) catch this and return a DENIED result.
 *
 * GovError is NOT thrown by create/upgrade/resolve/override methods — those return
 * typed result objects.
 */
export class GovError extends Error {
  constructor(
    public readonly code: 'ENTITY_FROZEN' | 'ORG_FROZEN',
    message: string,
    public readonly escalationEventId?: string,
  ) {
    super(message);
    this.name = 'GovError';
  }
}

// ─── List Input / Result ───────────────────────────────────────────────────────

/**
 * Input to EscalationService.listEscalations().
 * All fields are optional filters. orgId is mandatory (RLS boundary).
 */
export type ListEscalationsInput = {
  orgId: string;
  entityType?: EscalationEntityType;
  entityId?: string;
  status?: EscalationStatus;
  /** Max rows to return. Defaults to 50. */
  limit?: number;
};

export type ListEscalationsResult =
  | { status: 'OK'; rows: EscalationEventRow[]; count: number }
  | { status: 'ERROR'; code: EscalationErrorCode; message: string };

// ─── Internal Row Shape ────────────────────────────────────────────────────────

/**
 * Shape of an escalation_events row as returned by Prisma.
 * Used internally by EscalationService.
 */
export type EscalationEventRow = {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  parentEscalationId: string | null;
  source: string;
  severityLevel: number;
  freezeRecommendation: boolean;
  triggeredByActorType: string;
  triggeredByPrincipal: string;
  reason: string;
  status: string;
  resolvedByPrincipal: string | null;
  resolutionReason: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
};
