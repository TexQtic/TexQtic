/**
 * TTP-FOUNDATION-001: TexQtic TradeTrust Pay — domain constants
 *
 * This file is the single source of truth for all TTP string literals used
 * across the codebase (service layer, tests, admin routes).
 *
 * Rules (CRITICAL — do not violate):
 *   - These constants MUST match the seeds in 20260515120000_ttp_foundation_001/migration.sql exactly.
 *   - Entity type strings MUST be uppercase (lifecycle_states.state_key uppercase invariant).
 *   - Feature flag keys MUST be lowercase_snake_case to match the feature_flags.key PK.
 *   - No business logic in this file. Constants only.
 *   - No imports. This file has zero dependencies.
 *
 * Slice boundary:
 *   Slice 1 (Schema Foundation): constants only — no service / route / UI code.
 *   Slice 2+: TTPInvoiceService, TTPVpcService, admin routes import from here.
 */

// ─── Invoice lifecycle state keys ─────────────────────────────────────────────
// Must match lifecycle_states(entity_type='INVOICE', state_key) seeds.

export const TTP_INVOICE_STATE = {
  /** Invoice created by seller; not yet submitted. Initial state. */
  DRAFT: 'DRAFT',
  /** Invoice submitted for platform verification. */
  SUBMITTED: 'SUBMITTED',
  /** Invoice under active admin review. */
  UNDER_REVIEW: 'UNDER_REVIEW',
  /**
   * Invoice verified by platform. Eligible for VPC generation.
   * Not terminal: can be superseded by a corrected invoice.
   */
  VERIFIED: 'VERIFIED',
  /** Invoice rejected as ineligible. Terminal, irreversible. */
  INELIGIBLE: 'INELIGIBLE',
  /** Invoice under dispute (buyer or seller raised). */
  DISPUTED: 'DISPUTED',
  /** Invoice withdrawn by seller or admin. Terminal, irreversible. */
  WITHDRAWN: 'WITHDRAWN',
  /** Invoice expired without resolution (system automation). Terminal, irreversible. */
  EXPIRED: 'EXPIRED',
  /** Invoice superseded by a corrected invoice. Terminal. */
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type TtpInvoiceState =
  (typeof TTP_INVOICE_STATE)[keyof typeof TTP_INVOICE_STATE];

/** States from which no further transitions are possible. */
export const TTP_INVOICE_TERMINAL_STATES: ReadonlySet<TtpInvoiceState> =
  new Set([
    TTP_INVOICE_STATE.INELIGIBLE,
    TTP_INVOICE_STATE.WITHDRAWN,
    TTP_INVOICE_STATE.EXPIRED,
    TTP_INVOICE_STATE.SUPERSEDED,
  ]);

// ─── VPC lifecycle state keys ─────────────────────────────────────────────────
// Must match lifecycle_states(entity_type='VPC', state_key) seeds.

export const TTP_VPC_STATE = {
  /** VPC issued and active. Not yet flagged for partner routing. */
  ACTIVE: 'ACTIVE',
  /** VPC approved for partner routing by admin. Awaiting transmission (Phase 2). */
  ROUTING_READY: 'ROUTING_READY',
  /** VPC data contract transmitted to finance partner. Terminal, irreversible. */
  TRANSMITTED: 'TRANSMITTED',
  /** VPC voided by admin. Terminal, irreversible. */
  VOIDED: 'VOIDED',
  /** VPC expired (TTL reached). Terminal, irreversible. */
  EXPIRED: 'EXPIRED',
} as const;

export type TtpVpcState = (typeof TTP_VPC_STATE)[keyof typeof TTP_VPC_STATE];

/** VPC states from which no further transitions are possible. */
export const TTP_VPC_TERMINAL_STATES: ReadonlySet<TtpVpcState> = new Set([
  TTP_VPC_STATE.TRANSMITTED,
  TTP_VPC_STATE.VOIDED,
  TTP_VPC_STATE.EXPIRED,
]);

// ─── Entity type identifiers ──────────────────────────────────────────────────
// Must match lifecycle_states.entity_type and allowed_transitions.entity_type values.

export const TTP_ENTITY_TYPE = {
  INVOICE: 'INVOICE',
  VPC: 'VPC',
} as const;

export type TtpEntityType =
  (typeof TTP_ENTITY_TYPE)[keyof typeof TTP_ENTITY_TYPE];

// ─── Feature flag keys ────────────────────────────────────────────────────────
// Must match feature_flags.key (PK) seeds.
// All TTP flags are seeded with enabled=false (kill-switch pattern).
// Numeric flags: service layer parses feature_flags.value (TEXT) → number.

export const TTP_FEATURE_FLAG = {
  /**
   * Global TTP kill-switch.
   * MUST be false until Slice 5 sign-off.
   * Boolean flag: value column is NULL.
   */
  TTP_ENABLED: 'ttp_enabled',

  /**
   * OQ-TTP-001: Max single-invoice amount (INR) for risk tier 1 orgs.
   * Default seeded value: '250000'. Numeric flag: value = TEXT string.
   */
  MAX_INVOICE_AMOUNT_TIER_1_INR: 'ttp_max_invoice_amount_tier_1_inr',

  /**
   * OQ-TTP-001: Max single-invoice amount (INR) for risk tier 2 orgs.
   * Default seeded value: '500000'.
   */
  MAX_INVOICE_AMOUNT_TIER_2_INR: 'ttp_max_invoice_amount_tier_2_inr',

  /**
   * OQ-TTP-001: Max single-invoice amount (INR) for risk tier 3 orgs.
   * Default seeded value: '1000000'.
   */
  MAX_INVOICE_AMOUNT_TIER_3_INR: 'ttp_max_invoice_amount_tier_3_inr',

  /**
   * OQ-TTP-003: Invoice gross_amount >= this value (INR) requires
   * maker-checker approval on UNDER_REVIEW → VERIFIED. Rule: >= (not >).
   * Default seeded value: '1000000'.
   */
  MAKER_CHECKER_THRESHOLD_INR: 'ttp_maker_checker_threshold_inr',

  /**
   * OQ-TTP-005: Days before a TTP eligibility assessment expires.
   * Governs auto-set valid_until when admin completes an assessment.
   * Default seeded value: '180'.
   */
  ELIGIBILITY_ASSESSMENT_VALIDITY_DAYS:
    'ttp_eligibility_assessment_validity_days',
} as const;

export type TtpFeatureFlag =
  (typeof TTP_FEATURE_FLAG)[keyof typeof TTP_FEATURE_FLAG];

// ─── Risk tier constants ───────────────────────────────────────────────────────
// Mirrors ttp_eligibility_assessments.risk_tier (SMALLINT 0–3).

export const TTP_RISK_TIER = {
  /** 0: Thin-file / MANUAL_REVIEW required. Max invoice cap = 0. Not eligible for VPC. */
  THIN_FILE: 0,
  /** 1: Low risk. Cap = ttp_max_invoice_amount_tier_1_inr (default 250000 INR). */
  LOW: 1,
  /** 2: Medium risk. Cap = ttp_max_invoice_amount_tier_2_inr (default 500000 INR). */
  MEDIUM: 2,
  /** 3: High (trusted). Cap = ttp_max_invoice_amount_tier_3_inr (default 1000000 INR). */
  HIGH: 3,
} as const;

export type TtpRiskTier = (typeof TTP_RISK_TIER)[keyof typeof TTP_RISK_TIER];

/** Risk tiers that are eligible for VPC generation (tier >= 1). */
export const TTP_VPC_ELIGIBLE_TIERS: ReadonlySet<TtpRiskTier> = new Set([
  TTP_RISK_TIER.LOW,
  TTP_RISK_TIER.MEDIUM,
  TTP_RISK_TIER.HIGH,
]);

// ─── Eligibility outcome constants ───────────────────────────────────────────
// Mirrors ttp_eligibility_assessments.eligibility_outcome CHECK constraint.

export const TTP_ELIGIBILITY_OUTCOME = {
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
} as const;

export type TtpEligibilityOutcome =
  (typeof TTP_ELIGIBILITY_OUTCOME)[keyof typeof TTP_ELIGIBILITY_OUTCOME];

// ─── Actor type constants (shared with allowed_transitions) ───────────────────
// Used in invoice_lifecycle_logs.actor_type and ttp_enrollment_logs.actor_type.

export const TTP_ACTOR_TYPE = {
  TENANT_USER: 'TENANT_USER',
  TENANT_ADMIN: 'TENANT_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  SYSTEM_AUTOMATION: 'SYSTEM_AUTOMATION',
} as const;

export type TtpActorType =
  (typeof TTP_ACTOR_TYPE)[keyof typeof TTP_ACTOR_TYPE];

// ─── Partner routing stub constants ───────────────────────────────────────────
// Mirrors partner_routing_stubs CHECK constraints.

export const TTP_PARTNER_TYPE = {
  NBFC_STUB: 'NBFC_STUB',
  BANK_STUB: 'BANK_STUB',
  FACTORING_STUB: 'FACTORING_STUB',
} as const;

export type TtpPartnerType =
  (typeof TTP_PARTNER_TYPE)[keyof typeof TTP_PARTNER_TYPE];

export const TTP_TRANSMISSION_STATUS = {
  PENDING: 'PENDING',
  TRANSMITTED: 'TRANSMITTED',
  FAILED: 'FAILED',
} as const;

export type TtpTransmissionStatus =
  (typeof TTP_TRANSMISSION_STATUS)[keyof typeof TTP_TRANSMISSION_STATUS];

// ─── GST verification constants ───────────────────────────────────────────────
// Mirrors gst_verifications CHECK constraints.

export const TTP_GST_FILING_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type TtpGstFilingStatus =
  (typeof TTP_GST_FILING_STATUS)[keyof typeof TTP_GST_FILING_STATUS];

export const TTP_GST_REVIEW_OUTCOME = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_MORE_INFO: 'NEEDS_MORE_INFO',
} as const;

export type TtpGstReviewOutcome =
  (typeof TTP_GST_REVIEW_OUTCOME)[keyof typeof TTP_GST_REVIEW_OUTCOME];

// ─── Assessment type constants ────────────────────────────────────────────────
// Mirrors ttp_eligibility_assessments.assessment_type values.

export const TTP_ASSESSMENT_TYPE = {
  /** Phase 1: admin-entered assessment, no live bureau API. */
  MANUAL: 'MANUAL',
  /** Phase 2 (future): live bureau API response. Schema already accommodates. */
  BUREAU_API: 'BUREAU_API',
} as const;

export type TtpAssessmentType =
  (typeof TTP_ASSESSMENT_TYPE)[keyof typeof TTP_ASSESSMENT_TYPE];

// ─── Enrollment state constants ───────────────────────────────────────────────
// Mirrors ttp_enrollment_logs.to_state values (TTP Slice 7).

export const TTP_ENROLLMENT_STATE = {
  /** Tenant has requested TTP enrollment. Initial state. */
  REQUESTED: 'REQUESTED',
  /** Admin has approved enrollment (all gates passed). */
  APPROVED: 'APPROVED',
  /** Admin has rejected enrollment. Terminal. */
  REJECTED: 'REJECTED',
  /** Enrollment suspended by admin. Reversible. */
  SUSPENDED: 'SUSPENDED',
  /** Enrollment cancelled. Terminal. */
  CANCELLED: 'CANCELLED',
} as const;

export type TtpEnrollmentState =
  (typeof TTP_ENROLLMENT_STATE)[keyof typeof TTP_ENROLLMENT_STATE];

/** Enrollment states from which no further transitions are possible. */
export const TTP_ENROLLMENT_TERMINAL_STATES: ReadonlySet<TtpEnrollmentState> = new Set([
  TTP_ENROLLMENT_STATE.REJECTED,
  TTP_ENROLLMENT_STATE.CANCELLED,
]);

// ─── Admin review outcome constants ──────────────────────────────────────────
// Valid outcomes for TtpEnrollmentService.adminReviewEnrollment (TTP Slice 7).

export const TTP_ENROLLMENT_REVIEW_OUTCOME = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;

export type TtpEnrollmentReviewOutcome =
  (typeof TTP_ENROLLMENT_REVIEW_OUTCOME)[keyof typeof TTP_ENROLLMENT_REVIEW_OUTCOME];

// ─── D-020-C: AI trigger audit constants ─────────────────────────────────────
// Used in invoice_lifecycle_logs.reason when ai_triggered = true.

/** Prefix required in reason when ai_triggered = true (D-020-C). */
export const TTP_AI_REASON_PREFIX = 'HUMAN_CONFIRMED:' as const;

// ─── Language governance constants ───────────────────────────────────────────
// TTP-IMPL-002: Interim advisory disclaimer for all TTP readiness signals.
// INTERIM ONLY — final text pending TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001.
// Do not use inline string literals elsewhere; always reference this constant.

/**
 * Interim advisory disclaimer for all TTP readiness signals.
 *
 * This text is informational and advisory only. It is NOT a credit score,
 * financing approval, payment guarantee, lending decision, or partner commitment.
 *
 * INTERIM: Final wording pending legal review under TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001.
 * Do not add this to route responses in this slice — that belongs to TTP-IMPL-005.
 */
export const TTP_DISCLAIMER_TEXT =
  'TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment.';
