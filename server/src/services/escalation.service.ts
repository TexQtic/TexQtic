/**
 * G-022 — EscalationService
 * Doctrine v1.4 + G-022 Design v1.1 + D-022-A/B/C/D constitutional directives
 *
 * Implements the Escalation + Kill-Switch Governance Layer:
 *   1. createEscalation    — Create a root escalation event.
 *   2. upgradeEscalation   — Create a severity-upgraded escalation (D-022-A).
 *   3. resolveEscalation   — Record RESOLVED status (new INSERT, never UPDATE).
 *   4. overrideEscalation  — Record OVERRIDDEN status (D-022-D override path).
 *   5. checkEntityFreeze   — Throws GovError if entity has OPEN severity >= 3.
 *   6. checkOrgFreeze      — Throws GovError if org is frozen (D-022-B).
 *
 * Constitutional guarantees:
 *   D-022-A: Severity upgrade chain is strictly monotonic — enforced at service layer
 *            (Layer 1) and DB trigger trg_escalation_severity_upgrade (Layer 2).
 *   D-022-B: Org freeze is read from escalation_events (entity_type='ORG').
 *            NO boolean column is used on the organizations table. Ever.
 *   D-022-C: freeze_recommendation is an informational flag only. This service
 *            NEVER reads it to trigger automatic config changes. Kill switch
 *            activation requires an explicit PLATFORM_ADMIN API call.
 *   D-022-D: Override path requires escalation_event_id + severity >= 2 + reason.
 *            Override does NOT bypass Maker-Checker; that is the caller's responsibility
 *            (see G-022_ESCALATION_DESIGN.md Part 3, D-022-D).
 *
 * Not implemented here (deferred):
 *   - Kill switch config toggle (config.KILL_SWITCH_ALL) → explicit PLATFORM_ADMIN route.
 *   - Sanction enforcement → G-024.
 *   - Reasoning log linkage → G-023.
 *   - Expiry sweeping / TTL resolution → G-023 cron job.
 */

import type { PrismaClient } from '@prisma/client';
import {
  GovError,
  type CreateEscalationInput,
  type UpgradeEscalationInput,
  type ResolveEscalationInput,
  type OverrideEscalationInput,
  type CreateEscalationResult,
  type UpgradeEscalationResult,
  type ResolveEscalationResult,
  type OverrideEscalationResult,
  type ListEscalationsInput,
  type ListEscalationsResult,
  type EscalationEventRow,
} from './escalation.types.js';

// ─── EscalationService ────────────────────────────────────────────────────────

export class EscalationService {
  /**
   * @param db - Prisma client. Injected for testability.
   *             In production, pass the singleton from src/db/prisma.ts.
   *             In tests, pass a mocked PrismaClient.
   */
  constructor(private readonly db: PrismaClient) {}

  // ─── Method 1: createEscalation ─────────────────────────────────────────────

  /**
   * Create a root-level escalation event (no parent).
   *
   * Constitutional constraints:
   *   - SYSTEM_AUTOMATION may only create LEVEL_0 and LEVEL_1 events.
   *     LEVEL_2+ requires a human actor (PLATFORM_ADMIN or TENANT_ADMIN).
   *   - reason must be non-empty (DB CHECK enforces, service also validates).
   *   - freeze_recommendation should only be true for entity_type='GLOBAL' LEVEL_4
   *     events (D-022-C). Setting it on other rows is not blocked — the flag
   *     is informational only and has no automated side effects regardless.
   *
   * @returns CreateEscalationResult — never throws.
   */
  async createEscalation(input: CreateEscalationInput): Promise<CreateEscalationResult> {
    // Layer 1: SYSTEM_AUTOMATION may not create LEVEL_2+ escalations
    if (
      input.triggeredByActorType === 'SYSTEM_AUTOMATION' &&
      input.severityLevel >= 2
    ) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          'SYSTEM_AUTOMATION may only create LEVEL_0 or LEVEL_1 escalation events. ' +
          `Attempted severity_level: ${input.severityLevel}. ` +
          'LEVEL_2+ requires a human actor (PLATFORM_ADMIN or TENANT_ADMIN). ' +
          '[G-022-ACTOR-LEVEL-VIOLATION]',
      };
    }

    // Layer 1: reason must be non-empty
    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'reason is required and must be non-empty. [G-022-REASON-REQUIRED]',
      };
    }

    try {
      const row = await this.db.escalationEvent.create({
        data: {
          orgId:                input.orgId,
          entityType:           input.entityType,
          entityId:             input.entityId,
          source:               input.source,
          severityLevel:        input.severityLevel,
          freezeRecommendation: input.freezeRecommendation ?? false,
          triggeredByActorType: input.triggeredByActorType,
          triggeredByPrincipal: input.triggeredByPrincipal,
          reason:               input.reason,
          status:               'OPEN',
          // parentEscalationId: not set — this is a root event
        },
      });

      return {
        status: 'CREATED',
        escalationEventId: row.id,
        createdAt: row.createdAt,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB write failed: ${err.message}`
            : 'Unknown error during createEscalation',
      };
    }
  }

  // ─── Method 2: upgradeEscalation ────────────────────────────────────────────

  /**
   * Upgrade the severity of an existing OPEN escalation event.
   * Inserts a NEW escalation row with parent_escalation_id pointing to the prior event.
   * The prior event is NEVER mutated (D-022-A + append-only guarantee).
   *
   * Service Layer 1 enforcement:
   *   - Parent must exist and be in OPEN status.
   *   - new.severity_level must be strictly > parent.severity_level.
   * DB Layer 2 enforcement:
   *   - Trigger trg_escalation_severity_upgrade fires on INSERT and enforces the same.
   *
   * @returns UpgradeEscalationResult — never throws.
   */
  async upgradeEscalation(input: UpgradeEscalationInput): Promise<UpgradeEscalationResult> {
    // Layer 1: reason must be non-empty
    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'reason is required for escalation upgrade. [G-022-REASON-REQUIRED]',
      };
    }

    // Layer 1: fetch parent to validate before attempting insert
    let parent: EscalationEventRow | null;
    try {
      parent = (await this.db.escalationEvent.findUnique({
        where: { id: input.parentEscalationId },
      })) as EscalationEventRow | null;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB read failed fetching parent escalation: ${err.message}`
            : 'Unknown error fetching parent escalation',
      };
    }

    if (!parent) {
      return {
        status: 'ERROR',
        code: 'ESCALATION_NOT_FOUND',
        message: `Parent escalation ${input.parentEscalationId} not found. [G-022-NOT-FOUND]`,
      };
    }

    if (parent.status !== 'OPEN') {
      return {
        status: 'ERROR',
        code: 'ESCALATION_NOT_OPEN',
        message:
          `Parent escalation ${input.parentEscalationId} has status "${parent.status}". ` +
          'Only OPEN escalations may be upgraded. [E-022-PARENT-NOT-OPEN]',
      };
    }

    // Layer 1: D-022-A monotonicity check
    if (input.severityLevel <= parent.severityLevel) {
      return {
        status: 'ERROR',
        code: 'SEVERITY_DOWNGRADE_FORBIDDEN',
        message:
          `D-022-A violation: new severity_level ${input.severityLevel} is not strictly ` +
          `greater than parent severity_level ${parent.severityLevel}. ` +
          'Severity downgrade and equal-severity re-insert are forbidden. ' +
          '[E-022-SEVERITY-DOWNGRADE]',
      };
    }

    try {
      const row = await this.db.escalationEvent.create({
        data: {
          orgId:                parent.orgId,
          entityType:           parent.entityType,
          entityId:             parent.entityId,
          parentEscalationId:   input.parentEscalationId,
          source:               input.source,
          severityLevel:        input.severityLevel,
          freezeRecommendation: false, // upgrade rows do not auto-set freeze_recommendation
          triggeredByActorType: input.triggeredByActorType,
          triggeredByPrincipal: input.triggeredByPrincipal,
          reason:               input.reason,
          status:               'OPEN',
        },
      });

      return {
        status: 'UPGRADED',
        escalationEventId: row.id,
        createdAt: row.createdAt,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Detect DB trigger [E-022-SEVERITY-DOWNGRADE] or [E-022-PARENT-NOT-OPEN]
      if (
        msg.includes('E-022-SEVERITY-DOWNGRADE') ||
        msg.includes('E-022-PARENT-NOT-OPEN') ||
        msg.includes('E-022-PARENT-NOT-FOUND')
      ) {
        return {
          status: 'ERROR',
          code: 'DB_TRIGGER_VIOLATION',
          message: `DB trigger rejected upgrade: ${msg}`,
        };
      }
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: `DB write failed during escalation upgrade: ${msg}`,
      };
    }
  }

  // ─── Method 3: resolveEscalation ────────────────────────────────────────────

  /**
   * Record a RESOLVED status for an OPEN escalation event.
   * Inserts a new escalation_events row with status='RESOLVED'.
   * The original OPEN row is NEVER updated (append-only).
   *
   * Note: Technically, resolution could be stored as a companion row or
   * as closing data on the same insert row (depending on design direction).
   * G-022 v1.1 uses a single-table append model where resolution information
   * is carried in the same row (resolved_by_principal, resolution_reason,
   * resolved_at) set at INSERT time. Status is immutable once set.
   *
   * Implementation: We INSERT a new row with status='RESOLVED' carrying the
   * original event's context PLUS the resolution data.
   * The original OPEN row remains untouched as a historical marker.
   *
   * @returns ResolveEscalationResult — never throws.
   */
  async resolveEscalation(input: ResolveEscalationInput): Promise<ResolveEscalationResult> {
    // Layer 1: reason must be non-empty
    if (!input.resolutionReason || input.resolutionReason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'resolutionReason is required and must be non-empty. [G-022-REASON-REQUIRED]',
      };
    }

    // Fetch the original OPEN event
    let original: EscalationEventRow | null;
    try {
      original = (await this.db.escalationEvent.findUnique({
        where: { id: input.escalationEventId },
      })) as EscalationEventRow | null;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB read failed: ${err.message}`
            : 'Unknown error fetching escalation for resolution',
      };
    }

    if (!original) {
      return {
        status: 'ERROR',
        code: 'ESCALATION_NOT_FOUND',
        message: `Escalation ${input.escalationEventId} not found. [G-022-NOT-FOUND]`,
      };
    }

    if (original.status !== 'OPEN') {
      return {
        status: 'ERROR',
        code: 'ESCALATION_NOT_OPEN',
        message:
          `Escalation ${input.escalationEventId} has status "${original.status}". ` +
          'Only OPEN escalations can be resolved.',
      };
    }

    // Insert a new RESOLVED row (the original OPEN row is untouched)
    try {
      const resolvedRow = await this.db.escalationEvent.create({
        data: {
          orgId:                original.orgId,
          entityType:           original.entityType,
          entityId:             original.entityId,
          parentEscalationId:   input.escalationEventId, // links to original OPEN row
          source:               original.source,
          severityLevel:        original.severityLevel, // same level — DB trigger allows equal for resolution
          freezeRecommendation: false,
          triggeredByActorType: original.triggeredByActorType,
          triggeredByPrincipal: original.triggeredByPrincipal,
          reason:               original.reason,
          status:               'RESOLVED',
          resolvedByPrincipal:  input.resolvedByPrincipal,
          resolutionReason:     input.resolutionReason,
          resolvedAt:           new Date(),
        },
      });

      return {
        status: 'RESOLVED',
        escalationEventId: resolvedRow.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: `DB write failed during escalation resolution: ${msg}`,
      };
    }
  }

  // ─── Method 4: overrideEscalation ───────────────────────────────────────────

  /**
   * Record an OVERRIDDEN status for an OPEN escalation event.
   * D-022-D: Override requires severity_level >= 2 and explicit reason.
   * Override does NOT silently bypass Maker-Checker — the caller (route layer)
   * must have already completed either Path A or Path B of D-022-D before calling this.
   *
   * This method only records the override — it does not execute the blocked transition.
   * The caller is responsible for calling StateMachineService.transition() after this
   * returns OVERRIDDEN (with the escalation_event_id and audit_log_id in the same transaction
   * — D-022-D override path enforcement is the route layer's responsibility).
   *
   * @returns OverrideEscalationResult — never throws.
   */
  async overrideEscalation(input: OverrideEscalationInput): Promise<OverrideEscalationResult> {
    // Layer 1: reason must be non-empty
    if (!input.resolutionReason || input.resolutionReason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'OVERRIDE_NO_ESCALATION_RECORD',
        message: 'resolutionReason is required for override. [D-022-D-REASON-REQUIRED]',
      };
    }

    // Fetch the original OPEN event
    let original: EscalationEventRow | null;
    try {
      original = (await this.db.escalationEvent.findUnique({
        where: { id: input.escalationEventId },
      })) as EscalationEventRow | null;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB read failed: ${err.message}`
            : 'Unknown error fetching escalation for override',
      };
    }

    if (!original) {
      return {
        status: 'ERROR',
        code: 'OVERRIDE_NO_ESCALATION_RECORD',
        message:
          `Escalation ${input.escalationEventId} not found. ` +
          'D-022-D requires an existing OPEN escalation record for override. [G-022-NOT-FOUND]',
      };
    }

    if (original.status !== 'OPEN') {
      return {
        status: 'ERROR',
        code: 'ESCALATION_NOT_OPEN',
        message:
          `Escalation ${input.escalationEventId} has status "${original.status}". ` +
          'Only OPEN escalations can be overridden. [D-022-D]',
      };
    }

    // D-022-D: override requires severity >= 2
    if (original.severityLevel < 2) {
      return {
        status: 'ERROR',
        code: 'OVERRIDE_LEVEL_TOO_LOW',
        message:
          `D-022-D violation: override attempted on escalation with severity_level ` +
          `${original.severityLevel} (< 2). ` +
          'Override path is only available for severity >= 2 (LEVEL_2 High Risk and above). ' +
          '[D-022-D-LEVEL-TOO-LOW]',
      };
    }

    // Insert a new OVERRIDDEN row (the original OPEN row is untouched)
    try {
      const overriddenRow = await this.db.escalationEvent.create({
        data: {
          orgId:                original.orgId,
          entityType:           original.entityType,
          entityId:             original.entityId,
          parentEscalationId:   input.escalationEventId, // links to original OPEN row
          source:               original.source,
          severityLevel:        original.severityLevel,
          freezeRecommendation: false,
          triggeredByActorType: original.triggeredByActorType,
          triggeredByPrincipal: original.triggeredByPrincipal,
          reason:               original.reason,
          status:               'OVERRIDDEN',
          resolvedByPrincipal:  input.resolvedByPrincipal,
          resolutionReason:     input.resolutionReason,
          resolvedAt:           new Date(),
        },
      });

      return {
        status: 'OVERRIDDEN',
        escalationEventId: overriddenRow.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: `DB write failed during escalation override: ${msg}`,
      };
    }
  }

  // ─── Method 5a: listEscalations ─────────────────────────────────────────────

  /**
   * List escalation_events rows for a given org (RLS boundary = orgId).
   * Optional filters: entityType, entityId, status.
   *
   * Returns at most `input.limit` rows (default 50) ordered by createdAt DESC.
   * @returns ListEscalationsResult — never throws.
   */
  async listEscalations(input: ListEscalationsInput): Promise<ListEscalationsResult> {
    try {
      const rows = (await this.db.escalationEvent.findMany({
        where: {
          orgId: input.orgId,
          ...(input.entityType && { entityType: input.entityType }),
          ...(input.entityId   && { entityId:   input.entityId }),
          ...(input.status     && { status:      input.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit ?? 50,
      })) as EscalationEventRow[];

      return { status: 'OK', rows, count: rows.length };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? `DB read failed: ${err.message}` : 'Unknown query error',
      };
    }
  }

  // ─── Method 5: checkEntityFreeze ────────────────────────────────────────────

  /**
   * Check whether an entity has an OPEN escalation event at severity >= 3.
   * If found, throws GovError('ENTITY_FROZEN', ...) — this is the freeze signal.
   *
   * Called by StateMachineService.transition() and MakerCheckerService.verifyAndReplay()
   * BEFORE executing any state change.
   *
   * Freeze condition: severity_level >= 3 and status = 'OPEN'
   *   - LEVEL_3: Critical Governance — entity-level hard freeze
   *   - LEVEL_4: Platform Freeze Candidate — entity-level scope
   *
   * @throws GovError with code 'ENTITY_FROZEN' if freeze is active.
   * @returns void if no freeze is active.
   */
  async checkEntityFreeze(entityType: string, entityId: string): Promise<void> {
    // Find OPEN escalations at severity >= 3 that have NOT been superseded by a resolution.
    // An OPEN row is considered resolved when a child row exists with
    //   parent_escalation_id = OPEN_row.id AND status IN ('RESOLVED', 'OVERRIDDEN').
    // This preserves append-only invariant while correctly reflecting resolved state.
    const openFreeze = (await this.db.escalationEvent.findFirst({
      where: {
        entityType,
        entityId,
        status:        'OPEN',
        severityLevel: { gte: 3 },
        // Exclude rows that already have a resolution/override child
        children: { none: { status: { in: ['RESOLVED', 'OVERRIDDEN'] } } },
      },
      select: { id: true, severityLevel: true, reason: true },
    })) as { id: string; severityLevel: number; reason: string } | null;

    if (openFreeze) {
      throw new GovError(
        'ENTITY_FROZEN',
        `Entity ${entityType}:${entityId} is frozen — open escalation [${openFreeze.id}] ` +
        `at severity LEVEL_${openFreeze.severityLevel}. ` +
        `Reason: ${openFreeze.reason}. ` +
        'Resolve or override the escalation before proceeding. [E-022-ENTITY-FREEZE]',
        openFreeze.id,
      );
    }
  }

  // ─── Method 6: checkOrgFreeze ────────────────────────────────────────────────

  /**
   * D-022-B: Check whether an org is frozen.
   * Org freeze is stored as an escalation_events row with:
   *   entity_type = 'ORG', entity_id = org_id, severity_level >= 3, status = 'OPEN'
   *
   * NO boolean is read from the organizations table. Ever.
   * NO config flag is read. Org freeze = a row in this table only.
   *
   * Called by StateMachineService.transition() and MakerCheckerService.verifyAndReplay()
   * BEFORE executing any state change for the org.
   *
   * @throws GovError with code 'ORG_FROZEN' if org-level freeze is active.
   * @returns void if no org freeze is active.
   */
  async checkOrgFreeze(orgId: string): Promise<void> {
    // D-022-B: org freeze = OPEN ORG-type escalation at severity >= 3
    //          with no resolution/override child (append-only check pattern).
    const orgFreeze = (await this.db.escalationEvent.findFirst({
      where: {
        entityType:    'ORG',
        entityId:      orgId,   // D-022-B: entity_id = org_id for ORG-type escalations
        status:        'OPEN',
        severityLevel: { gte: 3 },
        children: { none: { status: { in: ['RESOLVED', 'OVERRIDDEN'] } } },
      },
      select: { id: true, severityLevel: true, reason: true },
    })) as { id: string; severityLevel: number; reason: string } | null;

    if (orgFreeze) {
      throw new GovError(
        'ORG_FROZEN',
        `Org ${orgId} is frozen — open org-level escalation [${orgFreeze.id}] ` +
        `at severity LEVEL_${orgFreeze.severityLevel}. ` +
        `Reason: ${orgFreeze.reason}. ` +
        'No transitions are permitted for this org. ' +
        'Resolve or override the org freeze escalation to resume. [E-022-ORG-FREEZE]',
        orgFreeze.id,
      );
    }
  }
}
