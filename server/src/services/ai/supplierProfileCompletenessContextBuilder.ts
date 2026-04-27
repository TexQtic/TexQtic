/**
 * supplierProfileCompletenessContextBuilder.ts — Supplier Profile Completeness Context Builder
 *
 * Assembles a SupplierProfileCompletenessContext from live DB state for AI
 * completeness analysis. Implements TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 Slice 1.
 *
 * CIRCULAR DEPENDENCY POLICY:
 * This module does NOT import from routes/tenant.ts. The completeness scoring
 * algorithm (catalogItemAttributeCompleteness) is inlined as a local private
 * function (computeItemCompleteness) to prevent a circular dependency:
 *   routes/tenant.ts already imports from services/ai/ (rfqAssistContextBuilder,
 *   rfqAssistService). Introducing a reverse import would create a cycle.
 * This is the established codebase pattern — see rfqAssistContextBuilder.ts
 * header: "This design avoids a circular import between routes/tenant.ts ↔
 * services/ai/ by accepting pure-text parameters rather than importing from
 * tenant.ts directly."
 * Any changes to the scoring algorithm in routes/tenant.ts (catalogItemAttributeCompleteness)
 * MUST be mirrored in computeItemCompleteness() below.
 *
 * RULES:
 * - orgId MUST be JWT-derived by the caller — never client-supplied.
 * - No Gemini/provider calls, no runAiInference, no AiTaskType usage.
 * - No profile writes, no escrow fields, no buyer-facing output.
 * - price, publicationPosture, risk_score, is_white_label, plan are EXCLUDED
 *   at both query-select level and assertNoForbiddenAiFields() boundary check.
 * - PII redaction applied to legalName before context assembly.
 * - completenessScores are transient — never persisted.
 *
 * @module supplierProfileCompletenessContextBuilder
 */

import type { PrismaClient } from '@prisma/client';
import type {
  SupplierProfileCompletenessContext,
  CatalogItemSummary,
  CertificationSummary,
} from './aiContextPacks.js';
import { assertNoForbiddenAiFields } from './aiForbiddenData.js';
import { redactPii } from './piiGuard.js';

// ─── SupplierOrgProfileForContext ─────────────────────────────────────────────

/**
 * AI-safe supplier organization profile for completeness context.
 *
 * Excluded: risk_score, publication_posture, is_white_label, plan
 * (control-plane / financial data — constitutionally forbidden from AI paths).
 */
export interface SupplierOrgProfileForContext {
  orgId: string;
  slug: string;
  /** PII-redacted via redactPii() before assembly. */
  legalName: string;
  jurisdiction: string;
  registrationNo: string | null;
  orgType: string;
  primarySegmentKey: string | null;
  secondarySegmentKeys: string[];
  rolePositionKeys: string[];
  // risk_score: EXCLUDED — control-plane only; AI hard boundary
  // publication_posture: EXCLUDED — constitutionally forbidden from all AI paths
  // is_white_label: EXCLUDED — platform config; not AI context
  // plan: EXCLUDED — commercial tier; not AI context
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface SupplierProfileCompletenessResult {
  context: SupplierProfileCompletenessContext;
  orgProfile: SupplierOrgProfileForContext;
}

// ─── Local completeness scorer (private) ─────────────────────────────────────

/**
 * Local shape for completeness scoring input.
 * Mirrors CatalogItemForVectorText in routes/tenant.ts but is defined locally
 * to avoid importing from the route module (circular dependency prevention).
 */
interface CatalogItemScoreShape {
  catalogStage?: string | null;
  stageAttributes?: Record<string, unknown> | null;
  name?: string | null;
  material?: string | null;
  composition?: string | null;
  productCategory?: string | null;
  fabricType?: string | null;
  gsm?: unknown;
  widthCm?: unknown;
  construction?: string | null;
  color?: string | null;
  certifications?: unknown;
}

/**
 * Compute what fraction of the relevant attribute fields are non-null/non-empty.
 * Stage-aware. Returns a value in [0, 1]. Transient — never stored.
 *
 * NOTE: This mirrors catalogItemAttributeCompleteness() from routes/tenant.ts
 * exactly. Inlined to prevent the circular import described in the module header.
 * Any algorithmic changes in tenant.ts MUST be mirrored here.
 */
function computeItemCompleteness(item: CatalogItemScoreShape): number {
  const attrs = (item.stageAttributes ?? {}) as Record<string, unknown>;

  function hasAttr(key: string): boolean {
    const v = attrs[key];
    if (v == null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }

  function hasField(key: keyof CatalogItemScoreShape): boolean {
    const v = item[key];
    if (v == null || v === '') return false;
    if (Array.isArray(v) && (v as unknown[]).length === 0) return false;
    return true;
  }

  switch (item.catalogStage) {
    case 'YARN': {
      // 11 fields — mirrors YARN case in catalogItemAttributeCompleteness()
      const count = [
        hasField('name'), hasAttr('yarnType'), hasAttr('yarnCount'), hasAttr('countSystem'),
        hasAttr('ply'), hasAttr('fiber'), hasField('composition'), hasAttr('spinningType'),
        hasAttr('coneWeight'), hasAttr('endUse'), hasField('certifications'),
      ].filter(Boolean).length;
      return count / 11;
    }
    case 'FABRIC_KNIT': {
      // 9 fields
      const count = [
        hasField('name'), hasAttr('knitType'), hasAttr('gauge'), hasAttr('loopLength'),
        hasAttr('stretch'), hasField('material'), hasField('composition'), hasAttr('finish'),
        hasField('certifications'),
      ].filter(Boolean).length;
      return count / 9;
    }
    case 'GARMENT': {
      // 10 fields
      const count = [
        hasField('name'), hasAttr('garmentType'), hasAttr('gender'), hasAttr('ageGroup'),
        hasAttr('fabricComposition'), hasAttr('trims'), hasAttr('stitchingType'),
        hasAttr('washCare'), hasAttr('monthlyCapacity'), hasAttr('complianceCertifications'),
      ].filter(Boolean).length;
      return count / 10;
    }
    case 'MACHINE': {
      // 8 fields
      const count = [
        hasField('name'), hasAttr('machineType'), hasAttr('brand'), hasAttr('model'),
        hasAttr('year'), hasAttr('condition'), hasAttr('capacity'), hasAttr('serviceSupport'),
      ].filter(Boolean).length;
      return count / 8;
    }
    case 'SERVICE': {
      // 7 fields
      const count = [
        hasField('name'), hasAttr('serviceType'), hasAttr('specialization'),
        hasAttr('industryFocus'), hasAttr('locationCoverage'), hasAttr('turnaroundTimeDays'),
        hasField('certifications'),
      ].filter(Boolean).length;
      return count / 7;
    }
    default: {
      // FABRIC_WOVEN, null, or any other stage: 9 textile fields
      const fields = [
        'productCategory', 'fabricType', 'gsm', 'material', 'composition',
        'color', 'widthCm', 'construction', 'certifications',
      ] as const;
      const filled = fields.filter((f) => {
        const v = (item as Record<string, unknown>)[f];
        if (v == null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      }).length;
      return filled / 9;
    }
  }
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a validated SupplierProfileCompletenessContext from live DB state.
 *
 * Steps:
 * 1. Query org — forbidden fields (risk_score, publication_posture, is_white_label,
 *    plan) excluded at select level
 * 2. Query secondary segments and role positions (parallel)
 * 3. Query active catalog items — price and publicationPosture excluded at select level
 * 4. Query certifications — createdByUserId excluded at select level
 * 5. Assemble CatalogItemSummary[] and CertificationSummary[]
 * 6. Compute completenessScores map (transient; never stored)
 * 7. Compute stageBreakdown map
 * 8. Apply redactPii() to legalName
 * 9. Assemble SupplierOrgProfileForContext
 * 10. Assemble SupplierProfileCompletenessContext
 * 11. assertNoForbiddenAiFields() on both assembled objects (fail-safe boundary)
 *
 * @param prisma  Non-transactional PrismaClient (injected by caller)
 * @param orgId   JWT-derived supplier orgId — MUST NOT be client-supplied
 * @returns       Validated context + org profile
 * @throws        Error with 'AI_FORBIDDEN_FIELD_DETECTED' if boundary violation detected
 * @throws        Prisma NotFoundError if org does not exist
 */
export async function buildSupplierProfileCompletenessContext(
  prisma: PrismaClient,
  orgId: string,
): Promise<SupplierProfileCompletenessResult> {
  // Step 1: Query org — forbidden fields excluded at select level
  const org = await prisma.organizations.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      id: true,
      slug: true,
      legal_name: true,
      jurisdiction: true,
      registration_no: true,
      org_type: true,
      primary_segment_key: true,
      // risk_score: EXCLUDED — control-plane only; AI hard boundary
      // publication_posture: EXCLUDED — constitutionally forbidden
      // is_white_label: EXCLUDED — platform config
      // plan: EXCLUDED — commercial tier
    },
  });

  // Step 2: Query secondary segments and role positions in parallel
  const [secondarySegments, rolePositions] = await Promise.all([
    prisma.organizationSecondarySegment.findMany({
      where: { org_id: orgId },
      select: { segment_key: true },
    }),
    prisma.organizationRolePosition.findMany({
      where: { org_id: orgId },
      select: { role_position_key: true },
    }),
  ]);

  // Step 3: Query active catalog items — price + publicationPosture excluded at select level
  const rawItems = await prisma.catalogItem.findMany({
    where: { tenantId: orgId, active: true },
    select: {
      id: true,
      sku: true,
      name: true,
      catalogStage: true,
      stageAttributes: true,
      material: true,
      composition: true,
      moq: true,
      productCategory: true,
      fabricType: true,
      gsm: true,
      color: true,
      widthCm: true,
      construction: true,
      certifications: true,
      // price: EXCLUDED — constitutionally forbidden from all AI paths
      // publicationPosture: EXCLUDED — constitutionally forbidden from all AI paths
    },
  });

  // Step 4: Query certifications — createdByUserId excluded at select level
  const rawCerts = await prisma.certification.findMany({
    where: { orgId: orgId },
    select: {
      id: true,
      certificationType: true,
      expiresAt: true,
      // createdByUserId: EXCLUDED — PII; not needed for AI context
      // lifecycleStateId: EXCLUDED — not needed for AI context
      // issuedAt: EXCLUDED — not needed for AI context
    },
  });

  // Step 5a: Build CatalogItemSummary array
  const catalogItems: CatalogItemSummary[] = rawItems.map((item) => ({
    id: item.id,
    sku: item.sku ?? '',
    name: item.name,
    catalogStage: item.catalogStage ?? 'FABRIC_WOVEN',
    stageAttributes: (item.stageAttributes as Record<string, unknown>) ?? {},
    material: item.material ?? null,
    composition: item.composition ?? null,
    moq: item.moq ?? null,
  }));

  // Step 5b: Build CertificationSummary array
  const certifications: CertificationSummary[] = rawCerts.map((cert) => ({
    id: cert.id,
    certificationType: cert.certificationType,
    expiresAt: cert.expiresAt,
  }));

  // Step 6: Compute completenessScores (transient — never stored)
  const completenessScores: Record<string, number> = {};
  for (const item of rawItems) {
    completenessScores[item.id] = computeItemCompleteness({
      ...item,
      stageAttributes: (item.stageAttributes as Record<string, unknown>) ?? {},
    });
  }

  // Step 7: Compute stageBreakdown (stage → active item count)
  const stageBreakdown: Record<string, number> = {};
  for (const item of rawItems) {
    const stage = item.catalogStage ?? 'UNKNOWN';
    stageBreakdown[stage] = (stageBreakdown[stage] ?? 0) + 1;
  }

  // Step 8: PII redaction on legalName (supplier-authored free-text field)
  const legalNamePii = redactPii(org.legal_name);
  const safeLegalName = legalNamePii.hasMatches ? legalNamePii.redacted : org.legal_name;

  // Step 9: Assemble SupplierOrgProfileForContext
  const orgProfile: SupplierOrgProfileForContext = {
    orgId: org.id,
    slug: org.slug,
    legalName: safeLegalName,
    jurisdiction: org.jurisdiction,
    registrationNo: org.registration_no ?? null,
    orgType: org.org_type,
    primarySegmentKey: org.primary_segment_key ?? null,
    secondarySegmentKeys: secondarySegments.map((s) => s.segment_key),
    rolePositionKeys: rolePositions.map((r) => r.role_position_key),
  };

  // Step 10: Assemble SupplierProfileCompletenessContext
  const context: SupplierProfileCompletenessContext = {
    orgId: org.id,
    catalogItems,
    certifications,
    completenessScores,
    stageBreakdown,
  };

  // Step 11: Fail-safe boundary — assert no forbidden fields entered either object
  assertNoForbiddenAiFields(context);
  assertNoForbiddenAiFields(orgProfile);

  return { context, orgProfile };
}
