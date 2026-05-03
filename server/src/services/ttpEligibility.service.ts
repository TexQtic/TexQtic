/**
 * TtpEligibilityService — TTP Slice 3: CIBIL Eligibility Gate
 *
 * Manual admin assessment workflow. No live CIBIL or credit bureau API in this phase.
 *
 * Constraints:
 *  - GST verification must be APPROVED before an eligibility assessment can be created.
 *  - risk_tier 0 (THIN_FILE) must always result in MANUAL_REVIEW outcome.
 *  - ELIGIBLE outcome requires risk_tier >= 1.
 *  - Multiple assessments per org are allowed (full history retained).
 *  - getLatestAssessment returns the most recent by assessed_at DESC.
 *  - On ELIGIBLE with tier >= 1: organizations.risk_score is updated to risk_tier.
 *  - valid_until is resolved from feature flag ttp_eligibility_assessment_validity_days
 *    (default 180 days). Soft-defaulted — flag missing/invalid does not fail the request.
 *  - max_invoice_amount is resolved from tier-specific feature flag if not supplied.
 *
 * Governance: TTP Slice 3, D-017-A org isolation, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { PrismaClient } from '@prisma/client';
import {
  TTP_ELIGIBILITY_OUTCOME,
  TTP_ASSESSMENT_TYPE,
  TTP_FEATURE_FLAG,
  TTP_RISK_TIER,
  TTP_GST_REVIEW_OUTCOME,
} from '../ttp/ttp.constants.js';

// ─── Error classes ────────────────────────────────────────────────────────────

/**
 * GST prerequisite not met: no APPROVED gst_verifications record for org.
 * Admin must complete GST approval before an eligibility assessment can be created.
 */
export class EligibilityGstPrerequisiteError extends Error {
  constructor() {
    super('GST verification must be APPROVED before a TTP eligibility assessment can be created');
    this.name = 'EligibilityGstPrerequisiteError';
  }
}

/**
 * Tier / outcome combination is invalid.
 * Rules:
 *   - risk_tier 0 (THIN_FILE) → outcome must be MANUAL_REVIEW
 *   - ELIGIBLE outcome → risk_tier must be >= 1
 */
export class EligibilityTierOutcomeMismatchError extends Error {
  constructor(reason: string) {
    super(`Eligibility tier / outcome mismatch: ${reason}`);
    this.name = 'EligibilityTierOutcomeMismatchError';
  }
}

/**
 * No eligibility assessment record found for the organization.
 */
export class EligibilityNotFoundError extends Error {
  constructor() {
    super('No TTP eligibility assessment found for this organization');
    this.name = 'EligibilityNotFoundError';
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CreateAssessmentInput {
  risk_tier: number;
  eligibility_outcome: string;
  max_invoice_amount?: number | null;
  currency?: string | null;
  assessment_notes?: string | null;
  valid_until?: Date | null;
}

/** Full admin projection — all fields returned */
export interface TtpEligibilityAssessmentRecord {
  id: string;
  org_id: string;
  assessment_type: string;
  risk_tier: number;
  eligibility_outcome: string;
  max_invoice_amount: number | null;
  currency: string;
  assessed_at: Date;
  valid_until: Date | null;
  assessed_by_admin_id: string | null;
  assessment_notes: string | null;
  raw_bureau_json: unknown;
  created_at: Date;
  updated_at: Date;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Tier cap defaults (INR) as numeric values. Used if feature flag is missing/invalid. */
const TIER_DEFAULT_CAP_INR: Readonly<Record<number, number | null>> = {
  [TTP_RISK_TIER.THIN_FILE]: null,   // 0 — no cap, not eligible
  [TTP_RISK_TIER.LOW]: 250_000,      // 1
  [TTP_RISK_TIER.MEDIUM]: 500_000,   // 2
  [TTP_RISK_TIER.HIGH]: 1_000_000,   // 3
} as const;

/** Feature flag key for tier cap, keyed by tier number. */
const TIER_CAP_FLAG_KEY: Readonly<Record<number, string>> = {
  [TTP_RISK_TIER.LOW]: TTP_FEATURE_FLAG.MAX_INVOICE_AMOUNT_TIER_1_INR,
  [TTP_RISK_TIER.MEDIUM]: TTP_FEATURE_FLAG.MAX_INVOICE_AMOUNT_TIER_2_INR,
  [TTP_RISK_TIER.HIGH]: TTP_FEATURE_FLAG.MAX_INVOICE_AMOUNT_TIER_3_INR,
} as const;

const DEFAULT_VALIDITY_DAYS = 180;

/**
 * Resolve validity_days from the feature_flags table.
 * Returns DEFAULT_VALIDITY_DAYS if the flag is absent, disabled, or its value
 * cannot be parsed as a positive integer.
 */
async function resolveValidityDays(db: PrismaClient): Promise<number> {
  try {
    const flag = await db.featureFlag.findUnique({
      where: { key: TTP_FEATURE_FLAG.ELIGIBILITY_ASSESSMENT_VALIDITY_DAYS },
      select: { enabled: true, value: true },
    });
    if (!flag || !flag.enabled || !flag.value) return DEFAULT_VALIDITY_DAYS;
    const parsed = parseInt(flag.value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VALIDITY_DAYS;
  } catch {
    return DEFAULT_VALIDITY_DAYS;
  }
}

/**
 * Resolve max_invoice_amount from the tier-specific feature flag.
 * Returns the hard-coded tier default if the flag is absent, disabled,
 * or its value cannot be parsed as a positive number.
 */
async function resolveTierCapFromFlag(
  db: PrismaClient,
  tier: number,
): Promise<number | null> {
  const flagKey = TIER_CAP_FLAG_KEY[tier];
  if (!flagKey) return TIER_DEFAULT_CAP_INR[tier] ?? null;

  try {
    const flag = await db.featureFlag.findUnique({
      where: { key: flagKey },
      select: { enabled: true, value: true },
    });
    if (!flag || !flag.enabled || !flag.value) return TIER_DEFAULT_CAP_INR[tier] ?? null;
    const parsed = parseFloat(flag.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : (TIER_DEFAULT_CAP_INR[tier] ?? null);
  } catch {
    return TIER_DEFAULT_CAP_INR[tier] ?? null;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TtpEligibilityService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Validate risk_tier / eligibility_outcome combination (pure, no DB access).
   *
   * Rules:
   *  - risk_tier 0 (THIN_FILE) → outcome MUST be MANUAL_REVIEW
   *  - ELIGIBLE outcome → risk_tier MUST be >= 1
   *
   * Throws EligibilityTierOutcomeMismatchError on violation.
   */
  validateOutcomeTierCombination(tier: number, outcome: string): void {
    if (tier === TTP_RISK_TIER.THIN_FILE && outcome !== TTP_ELIGIBILITY_OUTCOME.MANUAL_REVIEW) {
      throw new EligibilityTierOutcomeMismatchError(
        `Risk tier 0 (thin-file) requires outcome MANUAL_REVIEW; got '${outcome}'`,
      );
    }

    if (outcome === TTP_ELIGIBILITY_OUTCOME.ELIGIBLE && tier < TTP_RISK_TIER.LOW) {
      throw new EligibilityTierOutcomeMismatchError(
        `ELIGIBLE outcome requires risk_tier >= 1; got tier ${tier}`,
      );
    }
  }

  /**
   * Create a new TTP eligibility assessment for an org.
   *
   * Pre-conditions:
   *  1. org must have an APPROVED gst_verifications record.
   *  2. risk_tier / eligibility_outcome combination must be valid.
   *
   * Behaviour:
   *  - Resolves max_invoice_amount from caller or tier feature flag.
   *  - Resolves valid_until from caller or feature flag (default 180 days).
   *  - Inserts a new assessment row (history is preserved; no upsert).
   *  - On ELIGIBLE with tier >= 1: updates organizations.risk_score to risk_tier.
   *
   * D-017-A: orgId is from auth context / route param only — never from body.
   */
  async createAssessment(
    orgId: string,
    adminId: string,
    data: CreateAssessmentInput,
  ): Promise<TtpEligibilityAssessmentRecord> {
    // ── 1. GST prerequisite check ─────────────────────────────────────────────
    const gstRecord = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
      select: { review_outcome: true },
    });

    if (!gstRecord || gstRecord.review_outcome !== TTP_GST_REVIEW_OUTCOME.APPROVED) {
      throw new EligibilityGstPrerequisiteError();
    }

    // ── 2. Tier / outcome validation ──────────────────────────────────────────
    this.validateOutcomeTierCombination(data.risk_tier, data.eligibility_outcome);

    // ── 3. Resolve max_invoice_amount ─────────────────────────────────────────
    let maxInvoiceAmount: number | null;
    if (data.max_invoice_amount !== undefined && data.max_invoice_amount !== null) {
      maxInvoiceAmount = data.max_invoice_amount;
    } else {
      maxInvoiceAmount = await resolveTierCapFromFlag(this.db, data.risk_tier);
    }

    // ── 4. Resolve valid_until ────────────────────────────────────────────────
    let validUntil: Date | null;
    if (data.valid_until !== undefined && data.valid_until !== null) {
      validUntil = data.valid_until;
    } else {
      const days = await resolveValidityDays(this.db);
      validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // ── 5. Insert assessment record ───────────────────────────────────────────
    const now = new Date();
    const record = await (this.db as any).ttp_eligibility_assessments.create({
      data: {
        org_id: orgId,
        assessment_type: TTP_ASSESSMENT_TYPE.MANUAL,
        risk_tier: data.risk_tier,
        eligibility_outcome: data.eligibility_outcome,
        max_invoice_amount: maxInvoiceAmount,
        currency: data.currency ?? 'INR',
        assessed_at: now,
        valid_until: validUntil,
        assessed_by_admin_id: adminId,
        assessment_notes: data.assessment_notes ?? null,
        raw_bureau_json: {},
        created_at: now,
        updated_at: now,
      },
    });

    // ── 6. On ELIGIBLE with tier >= 1: update org risk_score ──────────────────
    if (
      data.eligibility_outcome === TTP_ELIGIBILITY_OUTCOME.ELIGIBLE &&
      data.risk_tier >= TTP_RISK_TIER.LOW
    ) {
      await (this.db as any).organizations.update({
        where: { id: orgId },
        data: { risk_score: data.risk_tier },
      });
    }

    return this.toRecord(record);
  }

  /**
   * List all eligibility assessments for an org, newest-first.
   * Returns full admin records.
   */
  async listAssessments(orgId: string): Promise<TtpEligibilityAssessmentRecord[]> {
    const records = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: orgId },
      orderBy: { assessed_at: 'desc' },
    });
    return records.map((r: any) => this.toRecord(r));
  }

  /**
   * Get the most recent eligibility assessment for an org.
   * Returns null if no assessments exist.
   */
  async getLatestAssessment(orgId: string): Promise<TtpEligibilityAssessmentRecord | null> {
    const records = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: orgId },
      orderBy: { assessed_at: 'desc' },
      take: 1,
    });
    return records.length > 0 ? this.toRecord(records[0]) : null;
  }

  // ─── Private projector ────────────────────────────────────────────────────

  private toRecord(record: any): TtpEligibilityAssessmentRecord {
    return {
      id: record.id,
      org_id: record.org_id,
      assessment_type: record.assessment_type,
      risk_tier: record.risk_tier,
      eligibility_outcome: record.eligibility_outcome,
      max_invoice_amount:
        record.max_invoice_amount !== null && record.max_invoice_amount !== undefined
          ? Number(record.max_invoice_amount)
          : null,
      currency: record.currency,
      assessed_at: record.assessed_at,
      valid_until: record.valid_until,
      assessed_by_admin_id: record.assessed_by_admin_id,
      assessment_notes: record.assessment_notes,
      raw_bureau_json: record.raw_bureau_json,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}
