/**
 * TtpScoreSnapshotService — TTP Slice 1.5 / Slice 2
 *
 * Write-side service for `ttp_score_snapshots`.
 *
 * Design decisions (OQ-SS-01 through OQ-SS-05):
 *   OQ-SS-01: score_version is always 'TTP_V1' in Wave 2 (schema allows TEXQTICSCORE_V2 for future).
 *   OQ-SS-02: score_detail_json stores { factors, blockers, next_steps } — NOT score, band, disclaimer.
 *   OQ-SS-03: enrollment_id is a nullable FK to ttp_enrollment_logs.id. Set only for ENROLLMENT_APPROVED trigger.
 *   OQ-SS-04: score_disclaimer_hash = SHA-256(SCORE_DISCLAIMER). route_disclaimer_hash = SHA-256(TTP_DISCLAIMER_TEXT).
 *   OQ-SS-05: PARTNER_TRANSMITTED is not supported in Wave 2; rejected at runtime.
 *
 * Safety invariants (IMMUTABLE — do not remove):
 *   - ttp_enabled=false — this service does not gate on the flag; callers must check.
 *   - No mutation after insert — immutability is enforced at DB layer by trigger.
 *   - No routing stubs, no VPC creation, no escrow mutations.
 *   - No external API calls.
 */

import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  computeTtpScore,
  SCORE_DISCLAIMER,
  type TtpScoreInput,
} from './ttpScore.service.js';
import {
  TTP_DISCLAIMER_TEXT,
  TTP_GST_REVIEW_OUTCOME,
  TTP_ELIGIBILITY_OUTCOME,
} from '../ttp/ttp.constants.js';

// ─── Trigger event set (Wave 2 only) ─────────────────────────────────────────
// PARTNER_TRANSMITTED is forward-declared in the schema CHECK constraint but
// has no write path in Wave 2. Rejecting it at runtime prevents accidental
// premature activation before the partner-transmission integration exists.

export const TTP_SCORE_TRIGGER_EVENT = {
  VPC_ISSUED: 'VPC_ISSUED',
  ENROLLMENT_APPROVED: 'ENROLLMENT_APPROVED',
  ADMIN_REVIEW_COMPLETE: 'ADMIN_REVIEW_COMPLETE',
} as const;

export type TtpScoreTriggerEvent =
  (typeof TTP_SCORE_TRIGGER_EVENT)[keyof typeof TTP_SCORE_TRIGGER_EVENT];

const WAVE2_TRIGGER_EVENTS: ReadonlySet<string> = new Set(
  Object.values(TTP_SCORE_TRIGGER_EVENT),
);

// ─── Pre-computed disclaimer hashes (module-scope, computed once) ─────────────
// Hashed at module load to avoid repeated computation on every snapshot write.

const SCORE_DISCLAIMER_HASH = createHash('sha256')
  .update(SCORE_DISCLAIMER)
  .digest('hex');

const ROUTE_DISCLAIMER_HASH = createHash('sha256')
  .update(TTP_DISCLAIMER_TEXT)
  .digest('hex');

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SnapshotUnsupportedTriggerError extends Error {
  readonly triggerEvent: string;
  constructor(triggerEvent: string) {
    super(
      `TtpScoreSnapshotService: trigger event '${triggerEvent}' is not supported in Wave 2. ` +
        `Allowed events: ${[...WAVE2_TRIGGER_EVENTS].join(', ')}.`,
    );
    this.name = 'SnapshotUnsupportedTriggerError';
    this.triggerEvent = triggerEvent;
  }
}

// ─── Input / output types ─────────────────────────────────────────────────────

export interface CaptureSnapshotInput {
  /** Seller org ID — tenancy key for this snapshot row. */
  orgId: string;
  /** The event that triggered this snapshot. PARTNER_TRANSMITTED is not allowed. */
  triggerEvent: TtpScoreTriggerEvent;
  /** Trade context (optional — used for invoice/VPC/routing readiness lookups). */
  tradeId?: string | null;
  /** Invoice that was verified (optional — contextual link only, no scoring impact). */
  invoiceId?: string | null;
  /** VPC that was issued (optional — contextual link; used as source_event_id for VPC_ISSUED). */
  vpcId?: string | null;
  /**
   * Enrollment log entry ID (ttp_enrollment_logs.id) for ENROLLMENT_APPROVED.
   * Must be the ttp_enrollment_logs.id from the most recent log row, not the
   * trade or org ID. Used as source_event_id for ENROLLMENT_APPROVED.
   */
  enrollmentId?: string | null;
  /** Caller-provided source event ID (used for ADMIN_REVIEW_COMPLETE if not derivable). */
  sourceEventId?: string | null;
  /** Actor who triggered the snapshot (admin user ID, system actor, etc.). */
  actorId?: string | null;
  /** Caller-provided arbitrary metadata — JSON-serialisable object only. */
  metadata?: Record<string, unknown> | null;
}

export interface CaptureSnapshotResult {
  id: string;
  org_id: string;
  score_value: number;
  score_band: string;
  score_version: string;
  trigger_event: string;
  created_at: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TtpScoreSnapshotService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Assemble `TtpScoreInput` for a given org from the current DB state.
   *
   * - Org-level readiness (GST, eligibility, enrollment) is always queried.
   * - Trade-level readiness (invoice, VPC, routing) is queried only if `tradeId` is provided.
   * - Pure DB read — no mutations, no external calls.
   *
   * @param orgId    Seller org ID (tenant key).
   * @param tradeId  Optional trade context for invoice/VPC/routing lookups.
   */
  async assembleTtpScoreInput(
    orgId: string,
    tradeId?: string | null,
  ): Promise<TtpScoreInput> {
    // ── GST readiness (org-scoped) ────────────────────────────────────────
    const gstRecord = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
      select: { review_outcome: true },
    });

    // ── Eligibility readiness (org-scoped, latest assessment) ────────────
    const assessments: Array<{
      eligibility_outcome: string;
      risk_tier: number;
      valid_until: Date | null;
    }> = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: orgId },
      orderBy: { assessed_at: 'desc' },
      take: 1,
      select: { eligibility_outcome: true, risk_tier: true, valid_until: true },
    });
    const latestAssessment = assessments[0];

    const isEligibilityExpired = latestAssessment?.valid_until
      ? new Date(latestAssessment.valid_until) < new Date()
      : false;

    // ── Enrollment state (org-scoped, latest log) ─────────────────────────
    const enrollmentLogs: Array<{ to_state: string }> =
      await (this.db as any).ttp_enrollment_logs.findMany({
        where: { org_id: orgId },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { to_state: true },
      });
    const enrollmentState: string | null = enrollmentLogs[0]?.to_state ?? null;

    // ── Trade-scoped readiness (invoice, VPC, routing) ─────────────────────
    let invoiceReadiness: TtpScoreInput['invoice_readiness'] = {
      found: false,
      is_verified: false,
    };
    let vpcReadiness: TtpScoreInput['vpc_readiness'] = {
      found: false,
      is_active: false,
    };
    let routingReadiness: TtpScoreInput['routing_readiness'] = { found: false };

    if (tradeId) {
      // Invoice readiness
      const invoiceRows: Array<{ id: string; lifecycle_state_id: string }> =
        await (this.db as any).invoices.findMany({
          where: { trade_id: tradeId },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { id: true, lifecycle_state_id: true },
        });
      const latestInvoice = invoiceRows[0];
      let invoiceStateKey: string | null = null;
      if (latestInvoice) {
        const stateRow: { stateKey: string } | null =
          await (this.db as any).lifecycleState.findFirst({
            where: {
              id: latestInvoice.lifecycle_state_id,
              entityType: 'INVOICE',
            },
            select: { stateKey: true },
          });
        invoiceStateKey = stateRow?.stateKey ?? null;
      }
      invoiceReadiness = {
        found: latestInvoice !== undefined,
        is_verified: invoiceStateKey === 'VERIFIED',
      };

      // VPC readiness
      const vpcRows: Array<{ id: string; lifecycle_state_id: string }> =
        await (this.db as any).verified_payable_certificates.findMany({
          where: { trade_id: tradeId },
          orderBy: { issued_at: 'desc' },
          take: 1,
          select: { id: true, lifecycle_state_id: true },
        });
      const latestVpc = vpcRows[0];
      let vpcStateKey: string | null = null;
      if (latestVpc) {
        const stateRow: { stateKey: string } | null =
          await (this.db as any).lifecycleState.findFirst({
            where: { id: latestVpc.lifecycle_state_id, entityType: 'VPC' },
            select: { stateKey: true },
          });
        vpcStateKey = stateRow?.stateKey ?? null;
      }
      vpcReadiness = {
        found: latestVpc !== undefined,
        is_active: vpcStateKey === 'ACTIVE' || vpcStateKey === 'ROUTING_READY',
      };

      // Routing readiness (depends on VPC found)
      if (latestVpc) {
        const stubs: Array<{ transmission_status: string }> =
          await (this.db as any).partner_routing_stubs.findMany({
            where: { vpc_id: latestVpc.id },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { transmission_status: true },
          });
        routingReadiness = { found: stubs.length > 0 };
      }
    }

    return {
      gst_readiness: {
        found: gstRecord !== null,
        is_approved:
          gstRecord?.review_outcome === TTP_GST_REVIEW_OUTCOME.APPROVED,
      },
      eligibility_readiness: {
        found: latestAssessment !== undefined,
        is_eligible:
          latestAssessment?.eligibility_outcome ===
            TTP_ELIGIBILITY_OUTCOME.ELIGIBLE && !isEligibilityExpired,
        is_expired: isEligibilityExpired,
        risk_tier: latestAssessment?.risk_tier ?? null,
      },
      invoice_readiness: invoiceReadiness,
      vpc_readiness: vpcReadiness,
      routing_readiness: routingReadiness,
      enrollment_state: enrollmentState,
    };
  }

  /**
   * Compute the TTP advisory score from current DB state and persist an
   * immutable snapshot row.
   *
   * Best-effort caller pattern: this method may throw on DB failure.
   * Callers (e.g. enrollment approval, VPC issuance) should wrap in try/catch
   * and log the error without rolling back their primary operation.
   *
   * PARTNER_TRANSMITTED is rejected with SnapshotUnsupportedTriggerError.
   */
  async captureSnapshot(
    input: CaptureSnapshotInput,
  ): Promise<CaptureSnapshotResult> {
    // Runtime guard — PARTNER_TRANSMITTED and any future event not yet supported
    if (!WAVE2_TRIGGER_EVENTS.has(input.triggerEvent)) {
      throw new SnapshotUnsupportedTriggerError(input.triggerEvent);
    }

    // Assemble TtpScoreInput from current DB state
    const scoreInput = await this.assembleTtpScoreInput(
      input.orgId,
      input.tradeId,
    );

    // Compute score (pure, deterministic)
    const scoreResult = computeTtpScore(scoreInput);

    // score_detail_json: factors + blockers + next_steps ONLY (OQ-SS-02)
    // Excludes: score, band, disclaimer, any raw bureau/GST/CIBIL payload
    const scoreDetailJson = {
      factors: scoreResult.factors,
      blockers: scoreResult.blockers,
      next_steps: scoreResult.next_steps,
    };

    // Derive source_event_id from trigger context
    let sourceEventId: string | null = input.sourceEventId ?? null;
    if (sourceEventId === null) {
      if (input.triggerEvent === TTP_SCORE_TRIGGER_EVENT.VPC_ISSUED) {
        sourceEventId = input.vpcId ?? null;
      } else if (
        input.triggerEvent === TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED
      ) {
        // OQ-SS-03: enrollment_id is the ttp_enrollment_logs.id from the approval log
        sourceEventId = input.enrollmentId ?? null;
      }
      // ADMIN_REVIEW_COMPLETE: sourceEventId is the eligibility assessment ID,
      // passed by the caller via sourceEventId field.
    }

    const row = await (this.db as any).ttp_score_snapshots.create({
      data: {
        org_id: input.orgId,
        trade_id: input.tradeId ?? null,
        invoice_id: input.invoiceId ?? null,
        vpc_id: input.vpcId ?? null,
        enrollment_id: input.enrollmentId ?? null,
        score_value: scoreResult.score,
        score_band: scoreResult.band,
        score_version: 'TTP_V1',
        score_detail_json: scoreDetailJson,
        trigger_event: input.triggerEvent,
        source_event_id: sourceEventId,
        actor_id: input.actorId ?? null,
        score_disclaimer_hash: SCORE_DISCLAIMER_HASH,
        route_disclaimer_hash: ROUTE_DISCLAIMER_HASH,
        metadata_json: input.metadata ?? null,
      },
      select: {
        id: true,
        org_id: true,
        score_value: true,
        score_band: true,
        score_version: true,
        trigger_event: true,
        created_at: true,
      },
    });

    return row as CaptureSnapshotResult;
  }
}
