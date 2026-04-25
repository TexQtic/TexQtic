/**
 * rfqAssistContextBuilder.ts — RFQ Assist AI Context Pack Builder
 *
 * Assembles a validated RFQAssistantContext from pre-computed inputs. The caller
 * (route handler in tenant.ts) is responsible for supplying the pre-computed
 * text strings via the existing helpers:
 *   - assembleStructuredRfqRequirementSummaryText() from tenant.ts
 *   - buildCatalogItemVectorText() from tenant.ts
 *   - catalogItemAttributeCompleteness() from tenant.ts
 *
 * This design avoids a circular import between routes/tenant.ts ↔ services/ai/
 * by accepting pure-text parameters rather than importing from tenant.ts directly.
 *
 * Implements TECS-AI-RFQ-ASSISTANT-MVP-001 Section H (context builder).
 *
 * RULES:
 * - Accepts only pre-computed, PII-safe text; does NOT call Prisma directly.
 * - Runs assertNoForbiddenAiFields() on the assembled context before returning.
 * - Runs scanForPii() on both text inputs and redacts any PII found.
 * - Sets humanConfirmationRequired: true as a literal type — not a runtime flag.
 * - Returns a validated RFQAssistantContext ready for rfqAssistService.ts.
 *
 * @module rfqAssistContextBuilder
 */

import type { RFQAssistantContext, SimilarityResultRef } from './aiContextPacks.js';
import { assertNoForbiddenAiFields } from './aiForbiddenData.js';
import { redactPii } from './piiGuard.js';

// ─── Input type ───────────────────────────────────────────────────────────────

/**
 * Input to buildRfqAssistantContext().
 *
 * All text fields (structuredRequirementText, catalogItemText) must be computed
 * by the caller using the existing helpers in tenant.ts before passing here.
 */
export interface RfqAssistContextInput {
  /** JWT-derived buyer orgId */
  buyerOrgId: string;
  /** UUID of the RFQ being assisted */
  rfqId: string;
  /** Current RFQ status — OPEN or RESPONDED only */
  rfqStatus: string;
  /**
   * assembleStructuredRfqRequirementSummaryText() output.
   * Called by the route handler in tenant.ts to avoid circular import.
   */
  structuredRequirementText: string;
  /** UUID of the catalog item targeted by this RFQ */
  catalogItemId: string;
  /** Catalog item stage from RfqCatalogItemTarget.catalogStage */
  catalogItemStage: string | null;
  /**
   * buildCatalogItemVectorText() output.
   * Called by the route handler in tenant.ts to avoid circular import.
   */
  catalogItemText: string;
  /**
   * catalogItemAttributeCompleteness() score [0,1].
   * Called by the route handler in tenant.ts to avoid circular import.
   */
  catalogCompletenessScore: number;
  /** Supplier orgId (from RFQ target) — context only */
  supplierOrgId: string;
  /** Retrieved RAG chunks — max 3; no chunk content per piiGuard rules */
  retrievedChunks: SimilarityResultRef[];
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a validated RFQAssistantContext from pre-computed inputs.
 *
 * Steps:
 * 1. Redact PII from structuredRequirementText (buyer free-text may contain PII)
 * 2. Redact PII from catalogItemText (catalog descriptions may contain PII)
 * 3. Assemble RFQAssistantContext with humanConfirmationRequired: true
 * 4. Assert no forbidden AI fields on the assembled context (fail-safe boundary)
 *
 * @param input  Pre-computed context inputs from the route handler
 * @returns      Validated RFQAssistantContext ready for rfqAssistService.ts
 * @throws       Error with 'AI_FORBIDDEN_FIELD_DETECTED' if boundary violation detected
 */
export function buildRfqAssistantContext(input: RfqAssistContextInput): RFQAssistantContext {
  // 1. PII redaction on buyer-supplied free-text
  const requirementPii = redactPii(input.structuredRequirementText);
  const safeRequirementText = requirementPii.hasMatches
    ? requirementPii.redacted
    : input.structuredRequirementText;

  // 2. PII redaction on catalog item text (supplier-authored; may contain PII)
  const catalogPii = redactPii(input.catalogItemText);
  const safeCatalogText = catalogPii.hasMatches ? catalogPii.redacted : input.catalogItemText;

  // 3. Assemble context pack
  const ctx: RFQAssistantContext = {
    buyerOrgId: input.buyerOrgId,
    rfqId: input.rfqId,
    rfqStatus: input.rfqStatus,
    structuredRequirementText: safeRequirementText,
    catalogItemId: input.catalogItemId,
    catalogItemStage: input.catalogItemStage,
    catalogItemText: safeCatalogText,
    catalogCompletenessScore: input.catalogCompletenessScore,
    supplierOrgId: input.supplierOrgId,
    retrievedChunks: input.retrievedChunks,
    humanConfirmationRequired: true,
  };

  // 4. Fail-safe boundary: assert no forbidden fields entered the context pack
  assertNoForbiddenAiFields(ctx);

  return ctx;
}
