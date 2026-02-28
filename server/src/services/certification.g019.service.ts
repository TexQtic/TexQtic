/**
 * G-019 — CertificationService
 *
 * Implements certification CRUD and lifecycle transition enforcement.
 *
 * Constitutional compliance:
 *   - All DB operations use the Prisma client passed in (injected, db-context-scoped).
 *   - The caller (route handler) must establish withDbContext before invoking any method.
 *   - tenantId/orgId is NEVER accepted from request body — always from dbContext.
 *   - entity_type='CERTIFICATION' is validated before any StateMachineService call.
 *   - reason is mandatory for create and transition operations (D-020-D).
 *   - D-020-C: aiTriggered=true requires "HUMAN_CONFIRMED:" in reason.
 *
 * StateMachineService:
 *   CERTIFICATION entity_type is supported (EntityType union includes it).
 *   No lifecycle log table for CERTIFICATION yet (deferred post G-019).
 *
 * No escalation freeze gate for certifications (out of scope for G-019).
 * No direct Maker-Checker invocation — SM handles MC via PENDING_APPROVAL response.
 */

import type { PrismaClient } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';
import type { SanctionsService } from './sanctions.service.js';
import { SanctionBlockError } from './sanctions.service.js';

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type CertificationServiceErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_LIFECYCLE_STATE'
  | 'INVALID_INPUT'
  | 'TRANSITION_NOT_APPLIED'
  | 'STATE_MACHINE_ERROR'
  | 'DB_ERROR'
  | 'REASON_REQUIRED';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Input for CertificationService.createCertification().
 * orgId is set by the caller from authenticated context — never from body.
 */
export type CertificationCreateInput = {
  /** RLS boundary — set from authenticated session (withDbContext orgId). Never from body. */
  orgId: string;
  /** Open-coded cert category: GOTS, OEKO_TEX, ISO_9001, etc. */
  certificationType: string;
  /** Nullable — typically null at SUBMITTED stage; set on APPROVED. */
  issuedAt?: Date | null;
  /** Nullable — some certifications do not expire. */
  expiresAt?: Date | null;
  /** Soft reference to creating user (no FK enforced here). */
  createdByUserId?: string | null;
  /** D-020-D: Mandatory justification for create. */
  reason: string;
};

export type CertificationCreateResult =
  | { status: 'CREATED'; certificationId: string; stateKey: string }
  | { status: 'ERROR'; code: CertificationServiceErrorCode; message: string };

/**
 * Input for CertificationService.updateCertification().
 * Only safe metadata fields may be updated. Lifecycle state is immutable via this method.
 */
export type CertificationUpdateInput = {
  certificationId: string;
  orgId: string;
  /** Update cert type label (e.g., rename category). */
  certificationType?: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
};

export type CertificationUpdateResult =
  | { status: 'UPDATED'; certificationId: string }
  | { status: 'ERROR'; code: CertificationServiceErrorCode; message: string };

/**
 * Input for CertificationService.transitionCertification().
 * entity_type='CERTIFICATION' is hard-coded — never caller-supplied.
 */
export type CertificationTransitionInput = {
  certificationId: string;
  orgId: string;
  toStateKey: string;
  reason: string;
  actorRole: string;
  actorUserId?: string | null;
  actorAdminId?: string | null;
  /** D-020-C: if true, reason MUST contain "HUMAN_CONFIRMED:". */
  aiTriggered?: boolean;
};

export type CertificationTransitionResult =
  | { status: 'APPLIED'; newStateKey: string }
  | { status: 'PENDING_APPROVAL'; newStateKey: string }
  | { status: 'ESCALATION_REQUIRED'; newStateKey: string }
  | { status: 'ERROR'; code: CertificationServiceErrorCode; message: string };

// ─── CertificationService ────────────────────────────────────────────────────

export class CertificationService {
  /**
   * @param db            - Prisma client (injected; scoped via withDbContext at route level).
   * @param stateMachine  - StateMachineService for lifecycle transition enforcement.
   * @param sanctions     - SanctionsService (optional, G-024). When provided, org sanction
   *                        check is enforced before certification creation. Optional for
   *                        backward compat; should be injected in all production routes.
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
    private readonly sanctions?: SanctionsService | null,
  ) {}

  // ─── Method 1: createCertification ─────────────────────────────────────────

  /**
   * Create a new certification in SUBMITTED state.
   * The SUBMITTED state must exist in lifecycle_states for entity_type='CERTIFICATION'.
   */
  async createCertification(
    input: CertificationCreateInput,
  ): Promise<CertificationCreateResult> {
    // Input validation
    if (!input.certificationType || input.certificationType.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'INVALID_INPUT',
        message: 'certificationType is required and must be non-empty.',
      };
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message: 'reason is required for certification creation.',
      };
    }

    if (input.issuedAt && input.expiresAt && input.expiresAt <= input.issuedAt) {
      return {
        status: 'ERROR',
        code: 'INVALID_INPUT',
        message: 'expiresAt must be after issuedAt.',
      };
    }

    // ── G-024: Sanction check — org BEFORE lifecycle lookup or DB write ────────
    if (this.sanctions) {
      try {
        await this.sanctions.checkOrgSanction(input.orgId);
      } catch (err) {
        if (err instanceof SanctionBlockError) {
          return {
            status: 'ERROR',
            code: 'INVALID_INPUT',
            message: err.message,
          };
        }
        throw err;
      }
    }

    try {
      // Resolve SUBMITTED lifecycle state (stop condition if missing)
      const submittedState = await this.db.lifecycleState.findFirst({
        where: { entityType: 'CERTIFICATION', stateKey: 'SUBMITTED' },
        select: { id: true },
      });

      if (!submittedState) {
        return {
          status: 'ERROR',
          code: 'INVALID_LIFECYCLE_STATE',
          message:
            "Stop condition: lifecycle_states row for entityType='CERTIFICATION' stateKey='SUBMITTED' not found. " +
            'Run the certification seed (seed_state_machine.ts) before using CertificationService.',
        };
      }

      const certification = await this.db.certification.create({
        data: {
          orgId: input.orgId,
          certificationType: input.certificationType.trim().toUpperCase(),
          lifecycleStateId: submittedState.id,
          issuedAt: input.issuedAt ?? null,
          expiresAt: input.expiresAt ?? null,
          createdByUserId: input.createdByUserId ?? null,
        },
        select: { id: true },
      });

      return {
        status: 'CREATED',
        certificationId: certification.id,
        stateKey: 'SUBMITTED',
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error creating certification: ${err.message}`
            : 'Unknown DB error creating certification.',
      };
    }
  }

  // ─── Method 2: listCertifications ──────────────────────────────────────────

  /**
   * List certifications for the given orgId (tenant-scoped).
   * RLS already enforces org_id boundary at the DB level; orgId param is extra
   * application-layer defence (belt-and-suspenders: do not remove).
   */
  async listCertifications(
    orgId: string,
    opts?: { limit?: number; offset?: number; stateKey?: string },
  ): Promise<
    | {
        status: 'OK';
        items: Array<{
          id: string;
          certificationType: string;
          stateKey: string;
          issuedAt: Date | null;
          expiresAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>;
        total: number;
      }
    | { status: 'ERROR'; code: CertificationServiceErrorCode; message: string }
  > {
    try {
      const limit  = Math.min(opts?.limit  ?? 50, 200);
      const offset = opts?.offset ?? 0;

      // Build where clause, optionally filtering by state key
      const stateFilter = opts?.stateKey
        ? {
            lifecycleState: {
              stateKey: opts.stateKey.toUpperCase(),
            },
          }
        : {};

      const [items, total] = await this.db.$transaction([
        this.db.certification.findMany({
          where: { orgId, ...stateFilter },
          select: {
            id: true,
            certificationType: true,
            lifecycleState: { select: { stateKey: true } },
            issuedAt: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.certification.count({ where: { orgId, ...stateFilter } }),
      ]);

      return {
        status: 'OK',
        total,
        items: items.map(c => ({
          id: c.id,
          certificationType: c.certificationType,
          stateKey: c.lifecycleState.stateKey,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error listing certifications: ${err.message}`
            : 'Unknown DB error listing certifications.',
      };
    }
  }

  // ─── Method 3: getCertification ────────────────────────────────────────────

  /**
   * Get a single certification by id + orgId (tenant-scoped).
   */
  async getCertification(
    certificationId: string,
    orgId: string,
  ): Promise<
    | {
        status: 'OK';
        certification: {
          id: string;
          orgId: string;
          certificationType: string;
          stateKey: string;
          issuedAt: Date | null;
          expiresAt: Date | null;
          createdByUserId: string | null;
          createdAt: Date;
          updatedAt: Date;
        };
      }
    | { status: 'ERROR'; code: CertificationServiceErrorCode; message: string }
  > {
    try {
      const cert = await this.db.certification.findFirst({
        where: { id: certificationId, orgId },
        select: {
          id: true,
          orgId: true,
          certificationType: true,
          lifecycleState: { select: { stateKey: true } },
          issuedAt: true,
          expiresAt: true,
          createdByUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!cert) {
        return {
          status: 'ERROR',
          code: 'NOT_FOUND',
          message: `Certification ${certificationId} not found for org ${orgId}.`,
        };
      }

      return {
        status: 'OK',
        certification: {
          id: cert.id,
          orgId: cert.orgId,
          certificationType: cert.certificationType,
          stateKey: cert.lifecycleState.stateKey,
          issuedAt: cert.issuedAt,
          expiresAt: cert.expiresAt,
          createdByUserId: cert.createdByUserId,
          createdAt: cert.createdAt,
          updatedAt: cert.updatedAt,
        },
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error fetching certification: ${err.message}`
            : 'Unknown DB error fetching certification.',
      };
    }
  }

  // ─── Method 4: updateCertification ─────────────────────────────────────────

  /**
   * Update metadata-only fields (certificationType, issuedAt, expiresAt).
   * Lifecycle state is NOT mutable via this method — use transitionCertification().
   */
  async updateCertification(
    input: CertificationUpdateInput,
  ): Promise<CertificationUpdateResult> {
    // Validate cross-field constraint
    if (input.issuedAt && input.expiresAt && input.expiresAt <= input.issuedAt) {
      return {
        status: 'ERROR',
        code: 'INVALID_INPUT',
        message: 'expiresAt must be after issuedAt.',
      };
    }

    try {
      // Confirm existence and ownership before updating
      const existing = await this.db.certification.findFirst({
        where: { id: input.certificationId, orgId: input.orgId },
        select: { id: true },
      });

      if (!existing) {
        return {
          status: 'ERROR',
          code: 'NOT_FOUND',
          message: `Certification ${input.certificationId} not found for org ${input.orgId}.`,
        };
      }

      // Build partial update (only provided fields)
      const updateData: Record<string, unknown> = {};
      if (input.certificationType !== undefined) {
        updateData['certificationType'] = input.certificationType.trim().toUpperCase();
      }
      if (input.issuedAt !== undefined) {
        updateData['issuedAt'] = input.issuedAt;
      }
      if (input.expiresAt !== undefined) {
        updateData['expiresAt'] = input.expiresAt;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          status: 'ERROR',
          code: 'INVALID_INPUT',
          message: 'No updatable fields provided.',
        };
      }

      await this.db.certification.update({
        where: { id: input.certificationId },
        data: updateData,
      });

      return { status: 'UPDATED', certificationId: input.certificationId };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error updating certification: ${err.message}`
            : 'Unknown DB error updating certification.',
      };
    }
  }

  // ─── Method 5: transitionCertification ─────────────────────────────────────

  /**
   * Advance certification lifecycle state via StateMachineService.
   *
   * Enforcement pipeline:
   *  1. Load certification (orgId-scoped)
   *  2. Validate reason non-empty (D-020-D)
   *  3. AI boundary check (D-020-C)
   *  4. Resolve fromStateKey from current lifecycleStateId
   *  5. Assert entity_type='CERTIFICATION' on the current state (stop condition)
   *  6. Call StateMachineService.transition(entityType='CERTIFICATION')
   *  7. Interpret result: APPLIED / PENDING_APPROVAL / DENIED
   *  8. On APPLIED: update certification.lifecycle_state_id to new state
   */
  async transitionCertification(
    input: CertificationTransitionInput,
  ): Promise<CertificationTransitionResult> {
    // Step 2: validate reason
    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message: 'reason is required for lifecycle transitions.',
      };
    }

    // Step 3: AI boundary gate (D-020-C)
    if (input.aiTriggered === true && !input.reason.includes('HUMAN_CONFIRMED:')) {
      return {
        status: 'ERROR',
        code: 'INVALID_INPUT',
        message:
          'D-020-C violation: aiTriggered=true requires reason to contain "HUMAN_CONFIRMED:" prefix.',
      };
    }

    // Step 1: load certification (orgId-scoped)
    let cert: { id: string; orgId: string; lifecycleStateId: string } | null = null;
    try {
      cert = await this.db.certification.findFirst({
        where: { id: input.certificationId, orgId: input.orgId },
        select: { id: true, orgId: true, lifecycleStateId: true },
      });
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error loading certification: ${err.message}`
            : 'Unknown DB error loading certification.',
      };
    }

    if (!cert) {
      return {
        status: 'ERROR',
        code: 'NOT_FOUND',
        message: `Certification ${input.certificationId} not found for org ${input.orgId}.`,
      };
    }

    // Step 4 + 5: resolve fromStateKey and verify entity_type='CERTIFICATION'
    let fromStateKey: string;
    try {
      const state = await this.db.lifecycleState.findFirst({
        where: { id: cert.lifecycleStateId, entityType: 'CERTIFICATION' },
        select: { stateKey: true, entityType: true },
      });

      if (!state) {
        return {
          status: 'ERROR',
          code: 'INVALID_LIFECYCLE_STATE',
          message:
            `Stop condition: lifecycle_states row for id=${cert.lifecycleStateId} ` +
            `with entityType='CERTIFICATION' not found. Data integrity issue.`,
        };
      }

      fromStateKey = state.stateKey;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error resolving lifecycle state: ${err.message}`
            : 'Unknown DB error resolving lifecycle state.',
      };
    }

    // Step 6: call StateMachineService
    const smResult = await this.stateMachine.transition({
      entityType:   'CERTIFICATION',
      entityId:     cert.id,
      orgId:        cert.orgId,
      fromStateKey,
      toStateKey:   input.toStateKey.toUpperCase(),
      actorType:    input.actorUserId
        ? (input.actorAdminId ? 'PLATFORM_ADMIN' : 'TENANT_USER')
        : (input.actorAdminId ? 'PLATFORM_ADMIN' : 'SYSTEM_AUTOMATION'),
      actorUserId:  input.actorUserId  ?? null,
      actorAdminId: input.actorAdminId ?? null,
      actorRole:    input.actorRole,
      reason:       input.reason,
      aiTriggered:  input.aiTriggered ?? false,
    });

    // Step 7: interpret result
    if (smResult.status === 'DENIED') {
      return {
        status: 'ERROR',
        code: 'TRANSITION_NOT_APPLIED',
        message: smResult.message ?? `Transition to ${input.toStateKey} denied by StateMachineService.`,
      };
    }

    // G-020 NOTE: APPLIED branch permanently removed.
    // StateMachineService.transition() always returns CERTIFICATION_LOG_DEFERRED (DENIED)
    // for entityType='CERTIFICATION' (SM step 5 fast-path, certification.g019.service.ts
    // line ~520). This 'if (smResult.status === "APPLIED")' block was therefore
    // unreachable — removed to eliminate dead code and avoid misleading audit coverage.
    // G-023 will implement CERTIFICATION lifecycle log writes and add the APPLIED handler.

    // PENDING_APPROVAL or ESCALATION_REQUIRED: SM queued the transition; no DB update yet
    return {
      status: smResult.status as 'PENDING_APPROVAL' | 'ESCALATION_REQUIRED',
      newStateKey: input.toStateKey.toUpperCase(),
    };
  }
}
