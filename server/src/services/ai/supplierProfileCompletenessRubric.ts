/**
 * supplierProfileCompletenessRubric.ts — Supplier Profile Completeness Rubric Scorer
 *
 * Deterministic 10-category completeness rubric for TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001.
 * Implements Section D (D.1–D.10) of the design doc.
 *
 * RULES:
 * - Pure function — no IO, no DB calls, no AI/provider calls.
 * - Accepts SupplierProfileCompletenessResult from Slice 1 context builder.
 * - Returns SupplierProfileCompletenessReport with 10 categoryScores, overallCompleteness,
 *   missingFields, improvementActions, trustSignalWarnings, and humanReviewRequired: true.
 * - All category scores are [0,1]. overallCompleteness = mean of 10 category scores.
 * - No price fields, no publicationPosture, no risk_score in any output text or score.
 * - humanReviewRequired: true is a structural literal type — cannot be overridden.
 *
 * CONTEXT AVAILABILITY DEVIATIONS FROM DESIGN (documented per design §D):
 * - `description`: NOT present in CatalogItemSummary →
 *     catalogCoverage scored from 3 signals (design §D.3 signal 4 skipped);
 *     buyerDiscoverability scored from 3 signals (design §D.10 signal 4 skipped).
 * - `issuedAt` (certification): NOT present in CertificationSummary →
 *     certificationsDocuments scored from 3 signals (design §D.6 signal 2 skipped).
 * - Item-level `certifications` JSONB: NOT present in CatalogItemSummary →
 *     aiReadiness scored from 3 signals (design §D.9 signal 4 skipped).
 *
 * @module supplierProfileCompletenessRubric
 */

import type { CatalogItemSummary, CertificationSummary } from './aiContextPacks.js';
import type {
  SupplierOrgProfileForContext,
  SupplierProfileCompletenessResult,
} from './supplierProfileCompletenessContextBuilder.js';

// ─── Recognized certification types ──────────────────────────────────────────

/**
 * Known certification type keys that confer trust signal credit.
 * Source: GOTS, OEKO_TEX, ISO_9001, BCI, BLUESIGN, HIGG, SA8000, WRAP, SEDEX, etc.
 */
const RECOGNIZED_CERT_TYPES: ReadonlySet<string> = new Set([
  'GOTS',
  'OEKO_TEX',
  'ISO_9001',
  'BLUESIGN',
  'FAIR_TRADE',
  'BCI',
  'ISO_14001',
  'ISO_45001',
  'SA8000',
  'REACH',
  'STANDARD_100',
  'HIGG_INDEX',
  'ZDHC',
  'SEDEX',
  'GRS',
  'OCS',
  'RDS',
  'LEATHER_WORKING_GROUP',
  'WRAP',
  'SMETA',
  'C2C',
  'NORDIC_SWAN',
]);

// ─── Output types ─────────────────────────────────────────────────────────────

export type MissingFieldPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type WarningSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface MissingFieldEntry {
  category: string;
  field: string;
  priority: MissingFieldPriority;
  note?: string;
}

export interface ImprovementActionEntry {
  action: string;
  category: string;
  priority: MissingFieldPriority;
}

export interface TrustSignalWarningEntry {
  warning: string;
  severity: WarningSeverity;
  affectedCategory?: string;
}

/**
 * Output contract for TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 rubric scorer.
 *
 * AI BOUNDARY:
 *   - All scores are SUGGESTION-ONLY. Transient; never stored.
 *   - humanReviewRequired: true is a structural literal type — cannot be overridden.
 *   - AI has no write authority. No auto-apply.
 *   - No price fields. No publicationPosture. No risk_score. No buyer-visible score.
 */
export interface SupplierProfileCompletenessReport {
  /** Overall weighted completeness score [0,1] — mean of 10 category scores. Transient; never stored. */
  overallCompleteness: number;

  /** Per-category scores [0,1] — keys correspond to design D.1–D.10. Transient; never stored. */
  categoryScores: {
    profileIdentity: number;
    businessCapability: number;
    catalogCoverage: number;
    catalogAttributeQuality: number;
    stageTaxonomy: number;
    certificationsDocuments: number;
    /** MVP: always 0.5 (informational placeholder; no RFQ history analysis in MVP). */
    rfqResponsiveness: number;
    serviceCapabilityClarity: number;
    aiReadiness: number;
    buyerDiscoverability: number;
  };

  /**
   * Prioritised list of missing or incomplete fields.
   * Each entry identifies the category, field name, and priority.
   */
  missingFields: MissingFieldEntry[];

  /**
   * Concrete, actionable improvement suggestions.
   * MUST NOT contain price, publicationPosture, risk_score, or financial language.
   */
  improvementActions: ImprovementActionEntry[];

  /**
   * Trust signal warnings — issues that could reduce buyer confidence.
   * MUST NOT reference price, publicationPosture, or risk_score.
   */
  trustSignalWarnings: TrustSignalWarningEntry[];

  /** Deterministic plain-text summary of overall profile state and top recommended action. */
  reasoningSummary: string;

  /** Structural literal — human review required before acting on any suggestion. Cannot be overridden. */
  humanReviewRequired: true;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if the catalogStage string represents a real, user-assigned stage
 * (as opposed to an empty placeholder or the UNKNOWN sentinel).
 */
function hasMeaningfulStage(stage: string): boolean {
  return stage !== '' && stage.toUpperCase() !== 'UNKNOWN';
}

// ─── Category scorers (private) ───────────────────────────────────────────────

interface CategoryResult {
  score: number;
  missing: MissingFieldEntry[];
  actions: ImprovementActionEntry[];
  warnings?: TrustSignalWarningEntry[];
}

/** D.1 Profile Identity (4 signals, score = filled/4) */
function scoreProfileIdentity(orgProfile: SupplierOrgProfileForContext): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];

  // Signal 1: legalName set and non-empty (redactPii may produce [REDACTED] — still counts as set)
  const hasLegalName = orgProfile.legalName.length > 0;
  // Signal 2: jurisdiction is not UNKNOWN
  const hasJurisdiction =
    orgProfile.jurisdiction.length > 0 && orgProfile.jurisdiction.toUpperCase() !== 'UNKNOWN';
  // Signal 3: registrationNo present (not null and not empty)
  const hasRegistrationNo =
    orgProfile.registrationNo !== null && orgProfile.registrationNo.length > 0;
  // Signal 4: slug set (baseline — always true if org exists, but checked for completeness)
  const hasSlug = orgProfile.slug.length > 0;

  if (!hasLegalName) {
    missing.push({ category: 'profileIdentity', field: 'legalName', priority: 'HIGH' });
    actions.push({
      action: 'Add a legal name for the organization',
      category: 'profileIdentity',
      priority: 'HIGH',
    });
  }
  if (!hasJurisdiction) {
    missing.push({
      category: 'profileIdentity',
      field: 'jurisdiction',
      priority: 'MEDIUM',
      note: 'jurisdiction is UNKNOWN — update to a valid country/region',
    });
    actions.push({
      action: 'Update jurisdiction from UNKNOWN to a valid country or region',
      category: 'profileIdentity',
      priority: 'MEDIUM',
    });
  }
  if (!hasRegistrationNo) {
    missing.push({ category: 'profileIdentity', field: 'registrationNo', priority: 'LOW' });
    actions.push({
      action: 'Add a registration number to verify your legal identity',
      category: 'profileIdentity',
      priority: 'LOW',
    });
  }
  if (!hasSlug) {
    missing.push({ category: 'profileIdentity', field: 'slug', priority: 'HIGH' });
    actions.push({
      action: 'Set a unique slug for the organization',
      category: 'profileIdentity',
      priority: 'HIGH',
    });
  }

  const filled = [hasLegalName, hasJurisdiction, hasRegistrationNo, hasSlug].filter(Boolean).length;
  return { score: filled / 4, missing, actions };
}

/** D.2 Business Capability (3 signals, score = filled/3) */
function scoreBusinessCapability(orgProfile: SupplierOrgProfileForContext): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];

  const hasPrimary =
    orgProfile.primarySegmentKey !== null && orgProfile.primarySegmentKey.length > 0;
  const hasSecondary = orgProfile.secondarySegmentKeys.length > 0;
  const hasRoles = orgProfile.rolePositionKeys.length > 0;

  if (!hasPrimary) {
    missing.push({
      category: 'businessCapability',
      field: 'primarySegmentKey',
      priority: 'MEDIUM',
    });
    actions.push({
      action: 'Add a primary business capability segment',
      category: 'businessCapability',
      priority: 'MEDIUM',
    });
  }
  if (!hasSecondary) {
    missing.push({
      category: 'businessCapability',
      field: 'secondarySegmentKeys',
      priority: 'LOW',
    });
    actions.push({
      action: 'Add secondary business capability segments to improve visibility',
      category: 'businessCapability',
      priority: 'LOW',
    });
  }
  if (!hasRoles) {
    missing.push({ category: 'businessCapability', field: 'rolePositionKeys', priority: 'LOW' });
    actions.push({
      action: 'Add trade role positions (e.g., MANUFACTURER, EXPORTER)',
      category: 'businessCapability',
      priority: 'LOW',
    });
  }

  const filled = [hasPrimary, hasSecondary, hasRoles].filter(Boolean).length;
  return { score: filled / 3, missing, actions };
}

/**
 * D.3 Catalog Coverage (3 signals — description not available in CatalogItemSummary,
 *   design §D.3 signal 4 skipped, scored from 3 signals).
 */
function scoreCatalogCoverage(items: CatalogItemSummary[]): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];
  const warnings: TrustSignalWarningEntry[] = [];

  // Signal 1: at least 1 active item
  const hasAtLeastOne = items.length >= 1;
  // Signal 2: at least 3 active items
  const hasAtLeastThree = items.length >= 3;
  // Signal 3: more than 1 distinct meaningful catalogStage
  const distinctStages = new Set(
    items.map((i) => i.catalogStage).filter((s) => hasMeaningfulStage(s)),
  );
  const hasMultipleStages = distinctStages.size > 1;
  // Signal 4: description — NOT in CatalogItemSummary; skipped per module header deviation.

  if (!hasAtLeastOne) {
    missing.push({
      category: 'catalogCoverage',
      field: 'catalogItems',
      priority: 'HIGH',
      note: 'No active catalog items found',
    });
    actions.push({
      action: 'Add at least one active catalog item to your catalog',
      category: 'catalogCoverage',
      priority: 'HIGH',
    });
    warnings.push({
      warning: 'No active catalog items — buyers cannot discover your catalog',
      severity: 'CRITICAL',
      affectedCategory: 'catalogCoverage',
    });
  } else if (!hasAtLeastThree) {
    missing.push({
      category: 'catalogCoverage',
      field: 'catalogItems',
      priority: 'MEDIUM',
      note: 'Fewer than 3 active items — add more to improve coverage',
    });
    actions.push({
      action: 'Add at least 3 active catalog items for better coverage',
      category: 'catalogCoverage',
      priority: 'MEDIUM',
    });
  }
  if (!hasMultipleStages && items.length > 0) {
    missing.push({
      category: 'catalogCoverage',
      field: 'catalogStage (variety)',
      priority: 'LOW',
      note: 'All items share the same catalog stage — diversify for broader coverage',
    });
    actions.push({
      action: 'Diversify your catalog across multiple stage categories',
      category: 'catalogCoverage',
      priority: 'LOW',
    });
  }

  const filled = [hasAtLeastOne, hasAtLeastThree, hasMultipleStages].filter(Boolean).length;
  // 0 items → 0/3 = 0 naturally; no special-case needed (all signals false → filled = 0)
  return { score: filled / 3, missing, actions, warnings };
}

/** D.4 Catalog Attribute Quality — mean of completenessScores across all active items. */
function scoreCatalogAttributeQuality(
  items: CatalogItemSummary[],
  completenessScores: Record<string, number>,
): CategoryResult {
  if (items.length === 0) return { score: 0, missing: [], actions: [] };

  const scores = items.map((i) => completenessScores[i.id] ?? 0);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const actions: ImprovementActionEntry[] = [];
  if (mean < 0.6) {
    actions.push({
      action:
        'Complete required stage attributes for catalog items to improve attribute quality',
      category: 'catalogAttributeQuality',
      priority: 'HIGH',
    });
  } else if (mean < 0.8) {
    actions.push({
      action: 'Fill in remaining catalog item attributes to reach full quality',
      category: 'catalogAttributeQuality',
      priority: 'MEDIUM',
    });
  }

  return { score: mean, missing: [], actions };
}

/**
 * D.5 Stage Taxonomy (3 signals, score = filled/3).
 *
 * Edge case: if items exist but none have a meaningful stage → return 0 (all signals fail).
 */
function scoreStageTaxonomy(
  items: CatalogItemSummary[],
  completenessScores: Record<string, number>,
): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];
  const warnings: TrustSignalWarningEntry[] = [];

  if (items.length === 0) return { score: 0, missing, actions, warnings };

  const meaningfulItems = items.filter((i) => hasMeaningfulStage(i.catalogStage));

  // Special case: no items have a meaningful stage → all signals fail → score 0
  if (meaningfulItems.length === 0) {
    missing.push({
      category: 'stageTaxonomy',
      field: 'catalogStage',
      priority: 'HIGH',
      note: 'No items have a meaningful catalog stage assigned',
    });
    actions.push({
      action:
        'Assign a catalog stage (e.g., YARN, FABRIC_WOVEN, GARMENT) to all active items',
      category: 'stageTaxonomy',
      priority: 'HIGH',
    });
    warnings.push({
      warning:
        'All active catalog items are missing stage classification — stage taxonomy incomplete',
      severity: 'WARNING',
      affectedCategory: 'stageTaxonomy',
    });
    return { score: 0, missing, actions, warnings };
  }

  // Signal 1: ALL active items have a meaningful catalogStage
  const allHaveMeaningfulStage = meaningfulItems.length === items.length;

  // Signal 2: all meaningful-staged items have non-empty stageAttributes
  const allHaveStageAttributes = meaningfulItems.every(
    (i) => Object.keys(i.stageAttributes).length > 0,
  );

  // Signal 3: for the dominant stage (most items), at least 1 item has completeness >= 0.7
  const stageCounts: Record<string, number> = {};
  for (const item of meaningfulItems) {
    stageCounts[item.catalogStage] = (stageCounts[item.catalogStage] ?? 0) + 1;
  }
  const dominantStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantStageItems = meaningfulItems.filter((i) => i.catalogStage === dominantStage);
  const hasDominantHighCompleteness = dominantStageItems.some(
    (i) => (completenessScores[i.id] ?? 0) >= 0.7,
  );

  if (!allHaveMeaningfulStage) {
    const unstaged = items.length - meaningfulItems.length;
    missing.push({
      category: 'stageTaxonomy',
      field: 'catalogStage',
      priority: 'HIGH',
      note: `${unstaged} item(s) are missing a meaningful catalog stage`,
    });
    actions.push({
      action: 'Assign a catalog stage to all active items missing stage classification',
      category: 'stageTaxonomy',
      priority: 'HIGH',
    });
    warnings.push({
      warning: `${unstaged} catalog item(s) missing stage classification — incomplete taxonomy`,
      severity: 'WARNING',
      affectedCategory: 'stageTaxonomy',
    });
  }
  if (!allHaveStageAttributes) {
    missing.push({
      category: 'stageTaxonomy',
      field: 'stageAttributes',
      priority: 'HIGH',
      note: 'Some staged items have no stage-specific attributes',
    });
    actions.push({
      action: 'Fill in required stage attributes for all staged catalog items',
      category: 'stageTaxonomy',
      priority: 'HIGH',
    });
  }
  if (!hasDominantHighCompleteness && dominantStage !== undefined) {
    missing.push({
      category: 'stageTaxonomy',
      field: `stageAttributes (${dominantStage})`,
      priority: 'MEDIUM',
      note: `No ${dominantStage} item meets the completeness threshold (70%)`,
    });
    actions.push({
      action: `Improve attribute completeness for at least one ${dominantStage} item to 70% or above`,
      category: 'stageTaxonomy',
      priority: 'MEDIUM',
    });
  }

  const filled = [allHaveMeaningfulStage, allHaveStageAttributes, hasDominantHighCompleteness].filter(
    Boolean,
  ).length;
  return { score: filled / 3, missing, actions, warnings };
}

/**
 * D.6 Certifications and Documents (3 signals — issuedAt not in CertificationSummary;
 *   design §D.6 signal 2 skipped, scored from 3 signals).
 *
 * Special case: 0 certs → score 0 (vacuous noExpiredCerts signal suppressed).
 */
function scoreCertificationsDocuments(certs: CertificationSummary[]): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];
  const warnings: TrustSignalWarningEntry[] = [];

  // Special case: no certs at all → score 0 (suppress vacuous noExpiredCerts credit)
  if (certs.length === 0) {
    missing.push({
      category: 'certificationsDocuments',
      field: 'certifications',
      priority: 'MEDIUM',
      note: 'No certification records present',
    });
    actions.push({
      action:
        'Add at least one certification (e.g., GOTS, OEKO_TEX, ISO_9001) to your profile',
      category: 'certificationsDocuments',
      priority: 'MEDIUM',
    });
    warnings.push({
      warning:
        'No certification records — buyers may have reduced trust in your compliance status',
      severity: 'CRITICAL',
      affectedCategory: 'certificationsDocuments',
    });
    return { score: 0, missing, actions, warnings };
  }

  const now = new Date();

  // Signal 1: at least 1 certification present (always true here since certs.length > 0)
  const hasCerts = true;

  // Signal 2: no expired certifications (all expiresAt null or in future)
  const expiredCerts = certs.filter((c) => c.expiresAt !== null && c.expiresAt < now);
  const noExpiredCerts = expiredCerts.length === 0;

  // Signal 3: at least 1 recognized certificationType
  const hasRecognizedType = certs.some((c) =>
    RECOGNIZED_CERT_TYPES.has(c.certificationType.toUpperCase()),
  );

  // issuedAt (approved cert signal): NOT in CertificationSummary — skipped per module header.

  if (!noExpiredCerts) {
    for (const cert of expiredCerts) {
      warnings.push({
        warning: `Certification "${cert.certificationType}" has expired — renew to maintain buyer trust`,
        severity: 'WARNING',
        affectedCategory: 'certificationsDocuments',
      });
    }
    missing.push({
      category: 'certificationsDocuments',
      field: 'certifications (expired)',
      priority: 'MEDIUM',
      note: `${expiredCerts.length} expired certification(s) — renewal recommended`,
    });
    actions.push({
      action: 'Renew or replace expired certifications to restore compliance status',
      category: 'certificationsDocuments',
      priority: 'MEDIUM',
    });
  }
  if (!hasRecognizedType) {
    missing.push({
      category: 'certificationsDocuments',
      field: 'certificationType (recognized)',
      priority: 'LOW',
      note: 'No certifications match recognized standard types',
    });
    actions.push({
      action:
        'Update certification types to recognized standards (e.g., GOTS, OEKO_TEX, ISO_9001)',
      category: 'certificationsDocuments',
      priority: 'LOW',
    });
  }

  const filled = [hasCerts, noExpiredCerts, hasRecognizedType].filter(Boolean).length;
  return { score: filled / 3, missing, actions, warnings };
}

/** D.7 RFQ Responsiveness — MVP fixed at 0.5 (informational placeholder). */
function scoreRfqResponsiveness(): number {
  return 0.5;
}

/**
 * D.8 Service and Capability Clarity.
 *
 * If no SERVICE items: N/A → full credit (1.0).
 * If SERVICE items exist: 3 signals (serviceType, specialization, turnaroundTimeDays).
 */
function scoreServiceCapabilityClarity(items: CatalogItemSummary[]): CategoryResult {
  const serviceItems = items.filter((i) => i.catalogStage === 'SERVICE');

  // N/A: no SERVICE items → full credit
  if (serviceItems.length === 0) return { score: 1.0, missing: [], actions: [] };

  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];

  // Signal 1: all SERVICE items have serviceType in stageAttributes
  const allHaveServiceType = serviceItems.every(
    (i) =>
      typeof i.stageAttributes['serviceType'] === 'string' &&
      (i.stageAttributes['serviceType'] as string).length > 0,
  );
  // Signal 2: all SERVICE items have specialization in stageAttributes
  const allHaveSpecialization = serviceItems.every(
    (i) =>
      typeof i.stageAttributes['specialization'] === 'string' &&
      (i.stageAttributes['specialization'] as string).length > 0,
  );
  // Signal 3: all SERVICE items have turnaroundTimeDays in stageAttributes
  const allHaveTurnaround = serviceItems.every(
    (i) => i.stageAttributes['turnaroundTimeDays'] != null,
  );

  if (!allHaveServiceType) {
    missing.push({
      category: 'serviceCapabilityClarity',
      field: 'stageAttributes.serviceType',
      priority: 'MEDIUM',
    });
    actions.push({
      action: 'Add a service type to all SERVICE catalog items',
      category: 'serviceCapabilityClarity',
      priority: 'MEDIUM',
    });
  }
  if (!allHaveSpecialization) {
    missing.push({
      category: 'serviceCapabilityClarity',
      field: 'stageAttributes.specialization',
      priority: 'MEDIUM',
    });
    actions.push({
      action: 'Add a specialization description to all SERVICE catalog items',
      category: 'serviceCapabilityClarity',
      priority: 'MEDIUM',
    });
  }
  if (!allHaveTurnaround) {
    missing.push({
      category: 'serviceCapabilityClarity',
      field: 'stageAttributes.turnaroundTimeDays',
      priority: 'LOW',
    });
    actions.push({
      action: 'Add turnaround time (days) to all SERVICE catalog items',
      category: 'serviceCapabilityClarity',
      priority: 'LOW',
    });
  }

  const filled = [allHaveServiceType, allHaveSpecialization, allHaveTurnaround].filter(
    Boolean,
  ).length;
  return { score: filled / 3, missing, actions };
}

/**
 * D.9 AI Readiness (3 signals — item-level certifications JSONB not in CatalogItemSummary;
 *   design §D.9 signal 4 skipped, scored from 3 signals).
 */
function scoreAiReadiness(
  items: CatalogItemSummary[],
  completenessScores: Record<string, number>,
): CategoryResult {
  if (items.length === 0) return { score: 0, missing: [], actions: [] };

  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];

  // Signal 1: all active items have name set
  const allHaveName = items.every((i) => typeof i.name === 'string' && i.name.length > 0);

  // Signal 2: mean completenessScore across items >= 0.6
  const scores = items.map((i) => completenessScores[i.id] ?? 0);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const meanAboveThreshold = mean >= 0.6;

  // Signal 3: at least 1 item has composition or material set
  const hasCompositionOrMaterial = items.some(
    (i) =>
      (typeof i.composition === 'string' && i.composition.length > 0) ||
      (typeof i.material === 'string' && i.material.length > 0),
  );

  // Signal 4: item-level certifications JSONB — NOT in CatalogItemSummary; skipped per module header.

  if (!allHaveName) {
    missing.push({
      category: 'aiReadiness',
      field: 'name',
      priority: 'HIGH',
      note: 'Some items are missing a name — required for AI analysis',
    });
    actions.push({
      action: 'Ensure all catalog items have a name set',
      category: 'aiReadiness',
      priority: 'HIGH',
    });
  }
  if (!meanAboveThreshold) {
    missing.push({
      category: 'aiReadiness',
      field: 'completenessScore (mean)',
      priority: 'MEDIUM',
      note: `Mean attribute completeness is ${(mean * 100).toFixed(0)}% — below 60% threshold for AI readiness`,
    });
    actions.push({
      action: 'Improve catalog item attribute completeness above 60% to enhance AI readiness',
      category: 'aiReadiness',
      priority: 'MEDIUM',
    });
  }
  if (!hasCompositionOrMaterial) {
    missing.push({
      category: 'aiReadiness',
      field: 'material / composition',
      priority: 'MEDIUM',
      note: 'No items have material or composition set — required for AI matching',
    });
    actions.push({
      action: 'Add material or composition information to at least one catalog item',
      category: 'aiReadiness',
      priority: 'MEDIUM',
    });
  }

  const filled = [allHaveName, meanAboveThreshold, hasCompositionOrMaterial].filter(Boolean).length;
  return { score: filled / 3, missing, actions };
}

/**
 * D.10 Buyer Discoverability (3 signals — description not in CatalogItemSummary;
 *   design §D.10 signal 4 skipped, scored from 3 signals).
 */
function scoreBuyerDiscoverability(items: CatalogItemSummary[]): CategoryResult {
  const missing: MissingFieldEntry[] = [];
  const actions: ImprovementActionEntry[] = [];

  // Signal 1: at least 1 active item
  const hasItems = items.length >= 1;
  // Signal 2: at least 1 item has moq explicitly set (not the default value of 1)
  const hasMoqSet = items.some((i) => i.moq !== null && i.moq !== undefined && i.moq !== 1);
  // Signal 3: at least 1 item has sku set (non-empty string)
  const hasSkuSet = items.some((i) => typeof i.sku === 'string' && i.sku.length > 0);
  // Signal 4: description — NOT in CatalogItemSummary; skipped per module header deviation.

  if (!hasItems) {
    missing.push({
      category: 'buyerDiscoverability',
      field: 'catalogItems',
      priority: 'HIGH',
      note: 'No active items — catalog is not discoverable',
    });
    actions.push({
      action: 'Add active catalog items to enable buyer discovery',
      category: 'buyerDiscoverability',
      priority: 'HIGH',
    });
  }
  if (!hasMoqSet && items.length > 0) {
    missing.push({
      category: 'buyerDiscoverability',
      field: 'moq (explicit)',
      priority: 'LOW',
      note: 'No items have an explicitly set MOQ — all items use the default quantity',
    });
    actions.push({
      action: 'Set an explicit minimum order quantity (MOQ) on at least one catalog item',
      category: 'buyerDiscoverability',
      priority: 'LOW',
    });
  }
  if (!hasSkuSet && items.length > 0) {
    missing.push({
      category: 'buyerDiscoverability',
      field: 'sku',
      priority: 'LOW',
      note: 'No items have a SKU set — SKUs improve item identifiability',
    });
    actions.push({
      action: 'Add SKU identifiers to catalog items for better discoverability',
      category: 'buyerDiscoverability',
      priority: 'LOW',
    });
  }

  const filled = [hasItems, hasMoqSet, hasSkuSet].filter(Boolean).length;
  // 0 items → all signals false → 0/3 = 0 naturally (no special-case needed)
  return { score: filled / 3, missing, actions };
}

// ─── Rubric builder (public export) ──────────────────────────────────────────

/**
 * Build a deterministic SupplierProfileCompletenessReport from a Slice 1 context result.
 *
 * Pure function — no IO, no DB calls, no AI/provider calls.
 *
 * Implements the 10-category rubric defined in design doc §D.1–D.10.
 * overallCompleteness = mean of all 10 category scores.
 *
 * @param result  Output of buildSupplierProfileCompletenessContext() (Slice 1)
 * @returns       Deterministic completeness report — transient; never stored
 */
export function buildSupplierProfileCompletenessRubric(
  result: SupplierProfileCompletenessResult,
): SupplierProfileCompletenessReport {
  const { context, orgProfile } = result;

  // Score each of the 10 categories
  const identityResult = scoreProfileIdentity(orgProfile);
  const capabilityResult = scoreBusinessCapability(orgProfile);
  const coverageResult = scoreCatalogCoverage(context.catalogItems);
  const qualityResult = scoreCatalogAttributeQuality(
    context.catalogItems,
    context.completenessScores,
  );
  const stageResult = scoreStageTaxonomy(context.catalogItems, context.completenessScores);
  const certResult = scoreCertificationsDocuments(context.certifications);
  const rfqScore = scoreRfqResponsiveness();
  const serviceResult = scoreServiceCapabilityClarity(context.catalogItems);
  const aiReadinessResult = scoreAiReadiness(context.catalogItems, context.completenessScores);
  const discoverabilityResult = scoreBuyerDiscoverability(context.catalogItems);

  // Assemble category scores
  const categoryScores = {
    profileIdentity: identityResult.score,
    businessCapability: capabilityResult.score,
    catalogCoverage: coverageResult.score,
    catalogAttributeQuality: qualityResult.score,
    stageTaxonomy: stageResult.score,
    certificationsDocuments: certResult.score,
    rfqResponsiveness: rfqScore,
    serviceCapabilityClarity: serviceResult.score,
    aiReadiness: aiReadinessResult.score,
    buyerDiscoverability: discoverabilityResult.score,
  };

  // overallCompleteness = mean of all 10 category scores
  const scoreValues = Object.values(categoryScores);
  const overallCompleteness =
    scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length;

  // Aggregate: missing fields (no catalogAttributeQuality missing — it's computed, not a field set)
  const missingFields: MissingFieldEntry[] = [
    ...identityResult.missing,
    ...capabilityResult.missing,
    ...coverageResult.missing,
    ...stageResult.missing,
    ...certResult.missing,
    ...serviceResult.missing,
    ...aiReadinessResult.missing,
    ...discoverabilityResult.missing,
  ];

  // Aggregate: improvement actions — sorted HIGH → MEDIUM → LOW
  const priorityOrder: Record<MissingFieldPriority, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  const improvementActions: ImprovementActionEntry[] = [
    ...identityResult.actions,
    ...capabilityResult.actions,
    ...coverageResult.actions,
    ...qualityResult.actions,
    ...stageResult.actions,
    ...certResult.actions,
    ...serviceResult.actions,
    ...aiReadinessResult.actions,
    ...discoverabilityResult.actions,
  ].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Aggregate: trust signal warnings
  const trustSignalWarnings: TrustSignalWarningEntry[] = [
    ...(coverageResult.warnings ?? []),
    ...(stageResult.warnings ?? []),
    ...(certResult.warnings ?? []),
  ];

  // Deterministic reasoning summary — no price/publicationPosture/risk_score language
  const percent = Math.round(overallCompleteness * 100);
  const topAction =
    improvementActions.find((a) => a.priority === 'HIGH') ?? improvementActions[0];
  const reasoningSummary = topAction
    ? `Supplier profile is ${percent}% complete. Top recommended action: ${topAction.action}`
    : `Supplier profile is ${percent}% complete. No critical improvements identified.`;

  return {
    overallCompleteness,
    categoryScores,
    missingFields,
    improvementActions,
    trustSignalWarnings,
    reasoningSummary,
    humanReviewRequired: true,
  };
}
