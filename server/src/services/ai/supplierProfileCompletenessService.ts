/**
 * supplierProfileCompletenessService.ts — Supplier Profile Completeness AI Service
 *
 * Orchestrates the AI-backed supplier profile completeness endpoint:
 *   1. Builds context using Slice 1 (supplierProfileCompletenessContextBuilder)
 *   2. Builds deterministic rubric using Slice 2 (supplierProfileCompletenessRubric)
 *   3. Assembles a compact prompt from the rubric result
 *   4. Calls runAiInference (which pre-computes the Gemini call outside the Prisma tx
 *      per HOTFIX-MODEL-TX-001, then writes AiUsageMeter + ReasoningLog + AuditLog inside tx)
 *   5. Validates AI response via Zod; merges deterministic scores + AI text
 *   6. Returns discriminated union (ok | parseError)
 *
 * AI CALL IS PRE-COMPUTED OUTSIDE PRISMA TX (HOTFIX-MODEL-TX-001 pattern):
 * This is delegated entirely to inferenceService.runAiInference which handles the
 * pre-computation block for taskType='supplier-profile-completeness' before withDbContext.
 *
 * Phase architecture (per design §I.2):
 *   Phase 1 — DB reads + context + rubric (this service, outside tx)
 *   Phase 2 — AI call (inside runAiInference, but outside withDbContext tx)
 *   Phase 3 — DB writes via runAiInference (inside tx: AiUsageMeter + ReasoningLog + AuditLog)
 *
 * RULES:
 * - No direct Prisma writes — delegates to inferenceService for all audit/usage/reasoning writes.
 * - On AI parse failure, returns deterministic rubric + parseError flag. Never throws.
 * - humanReviewRequired: true is always echoed. Cannot be overridden.
 * - No price, publicationPosture, or risk_score fields in any output.
 * - No profile writes. No DB state mutations. Read-only.
 * - orgId is ALWAYS from dbContext (never from request body).
 *
 * @module supplierProfileCompletenessService
 */

import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { DatabaseContext } from '../../lib/database-context.js';
import { runAiInference, type AiInferenceResult } from './inferenceService.js';
import { buildSupplierProfileCompletenessContext } from './supplierProfileCompletenessContextBuilder.js';
import {
  buildSupplierProfileCompletenessRubric,
  type SupplierProfileCompletenessReport,
  type ImprovementActionEntry,
  type TrustSignalWarningEntry,
} from './supplierProfileCompletenessRubric.js';
import { assertNoForbiddenAiFields } from './aiForbiddenData.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUPPLIER_PROFILE_COMPLETENESS_PREFLIGHT_TOKENS = 3000 as const;
export const SUPPLIER_PROFILE_COMPLETENESS_MODEL = 'gemini-2.5-flash' as const;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

/** Forbidden terms that must never appear in AI-generated text fields. */
const FORBIDDEN_TEXT_TERMS = [
  'price',
  'publicationposture',
  'publication_posture',
  'risk_score',
  'riskscore',
  'escrow',
  'grossamount',
] as const;

function containsForbiddenTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_TEXT_TERMS.some((t) => lower.includes(t));
}

const missingFieldEntrySchema = z.object({
  category: z.string().min(1),
  field: z.string().min(1),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  note: z.string().optional(),
});

const improvementActionEntrySchema = z
  .object({
    action: z.string().min(1),
    category: z.string().min(1),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })
  .refine((a) => !containsForbiddenTerm(a.action), {
    message: 'improvementAction.action contains a forbidden term (price, risk_score, etc.)',
  });

const trustSignalWarningEntrySchema = z
  .object({
    warning: z.string().min(1),
    severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
    affectedCategory: z.string().optional(),
  })
  .refine((w) => !containsForbiddenTerm(w.warning), {
    message: 'trustSignalWarning.warning contains a forbidden term (publicationPosture, risk_score, etc.)',
  });

/**
 * Full Zod schema for the SupplierProfileCompletenessReport.
 * Used to validate both the AI-enriched response and the deterministic rubric output.
 */
export const supplierProfileCompletenessReportSchema = z.object({
  overallCompleteness: z.number().min(0).max(1),
  categoryScores: z.object({
    profileIdentity: z.number().min(0).max(1),
    businessCapability: z.number().min(0).max(1),
    catalogCoverage: z.number().min(0).max(1),
    catalogAttributeQuality: z.number().min(0).max(1),
    stageTaxonomy: z.number().min(0).max(1),
    certificationsDocuments: z.number().min(0).max(1),
    rfqResponsiveness: z.number().min(0).max(1),
    serviceCapabilityClarity: z.number().min(0).max(1),
    aiReadiness: z.number().min(0).max(1),
    buyerDiscoverability: z.number().min(0).max(1),
  }),
  missingFields: z.array(missingFieldEntrySchema),
  improvementActions: z.array(improvementActionEntrySchema),
  trustSignalWarnings: z.array(trustSignalWarningEntrySchema),
  reasoningSummary: z
    .string()
    .max(500)
    .refine((s) => !containsForbiddenTerm(s), {
      message: 'reasoningSummary contains a forbidden term',
    }),
  humanReviewRequired: z.literal(true),
});

// ─── AI enrichment response schema (partial — only AI-enhanced text fields) ──

/**
 * The AI is only asked to produce enriched text fields.
 * Deterministic scores from the rubric are always authoritative.
 */
const aiEnrichmentResponseSchema = z.object({
  reasoningSummary: z.string().max(500),
  improvementActions: z.array(
    z.object({
      action: z.string().min(1),
      category: z.string().min(1),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })
  ),
  trustSignalWarnings: z.array(
    z.object({
      warning: z.string().min(1),
      severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
      affectedCategory: z.string().optional(),
    })
  ),
});

// ─── Parser ───────────────────────────────────────────────────────────────────

type ParseSupplierProfileCompletenessReportResult =
  | { ok: true; report: SupplierProfileCompletenessReport }
  | { ok: false; rawText: string };

/**
 * Attempts to parse and validate the AI-enriched response text.
 * Merges AI text fields with deterministic rubric scores.
 * Returns `{ ok: false }` on any parse/validation failure.
 *
 * The deterministic rubric is authoritative for all numeric scores.
 * The AI contributes `reasoningSummary`, `improvementActions`, and `trustSignalWarnings` text.
 */
export function parseSupplierProfileCompletenessReport(
  rawText: string,
  deterministicReport: SupplierProfileCompletenessReport
): ParseSupplierProfileCompletenessReportResult {
  // Strip markdown fences if present
  const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { ok: false, rawText };
  }

  const enrichmentResult = aiEnrichmentResponseSchema.safeParse(parsed);
  if (!enrichmentResult.success) {
    return { ok: false, rawText };
  }

  // Merge: deterministic scores + AI text fields
  const merged: SupplierProfileCompletenessReport = {
    overallCompleteness: deterministicReport.overallCompleteness,
    categoryScores: deterministicReport.categoryScores,
    missingFields: deterministicReport.missingFields, // deterministic — authoritative
    improvementActions: enrichmentResult.data.improvementActions as ImprovementActionEntry[],
    trustSignalWarnings: enrichmentResult.data.trustSignalWarnings as TrustSignalWarningEntry[],
    reasoningSummary: enrichmentResult.data.reasoningSummary,
    humanReviewRequired: true,
  };

  // Validate the merged report against the full schema
  const finalResult = supplierProfileCompletenessReportSchema.safeParse(merged);
  if (!finalResult.success) {
    return { ok: false, rawText };
  }

  return { ok: true, report: finalResult.data as SupplierProfileCompletenessReport };
}

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface SupplierProfileCompletenessServiceInput {
  /** orgId from dbContext — never from request body */
  orgId: string;
  /** Budget period key (YYYY-MM) */
  monthKey: string;
  /** Caller-generated trace requestId */
  requestId: string;
  /** Optional idempotency key from HTTP header */
  idempotencyKey?: string;
  /** Authenticated actor userId (nullable) */
  userId: string | null;
  /** Non-transactional PrismaClient */
  prisma: PrismaClient;
  /** RLS database context */
  dbContext: DatabaseContext;
}

export type SupplierProfileCompletenessServiceOk = {
  ok: true;
  report: SupplierProfileCompletenessReport;
  reasoningLogId: string;
  auditLogId: string;
  tokensUsed: number;
  costEstimateUSD: number;
  monthKey: string;
  hadInferenceError: boolean;
  humanReviewRequired: true;
};

export type SupplierProfileCompletenessServiceParseError = {
  ok: false;
  reportParseError: true;
  report: SupplierProfileCompletenessReport; // deterministic fallback
  reasoningLogId: string;
  auditLogId: string;
  hadInferenceError: boolean;
  humanReviewRequired: true;
};

export type SupplierProfileCompletenessServiceResult =
  | SupplierProfileCompletenessServiceOk
  | SupplierProfileCompletenessServiceParseError;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildSupplierProfileCompletenessPrompt(
  deterministicReport: SupplierProfileCompletenessReport,
  orgId: string
): { prompt: string; systemInstruction: string } {
  const systemInstruction =
    'You are a B2B textile trade platform AI assistant helping a supplier improve their profile completeness. ' +
    'Given a deterministic completeness analysis, produce an enriched explanation and actionable improvement suggestions. ' +
    'Respond ONLY with a valid JSON object. No prose. No markdown fences. No explanation outside the JSON. ' +
    'The JSON must contain exactly these fields: ' +
    '"reasoningSummary" (string, max 500 chars — plain-text overall summary of profile state and top recommended actions), ' +
    '"improvementActions" (array of objects, each with: "action" string, "category" string, "priority" "HIGH"|"MEDIUM"|"LOW"), ' +
    '"trustSignalWarnings" (array of objects, each with: "warning" string, "severity" "CRITICAL"|"WARNING"|"INFO", "affectedCategory" optional string). ' +
    'CRITICAL RULES: ' +
    'Do NOT include price, payment terms, escrow, publicationPosture, risk_score, or any financial data in any field. ' +
    'Do NOT suggest any automatic profile updates — all suggestions require human review. ' +
    'Do NOT include buyer-facing scores or buyer-visible content. ' +
    'humanReviewRequired is always true and must NOT be overridden.';

  const categoryLines = Object.entries(deterministicReport.categoryScores)
    .map(([k, v]) => `  ${k}: ${(v * 100).toFixed(0)}%`)
    .join('\n');

  const topMissing = deterministicReport.missingFields
    .slice(0, 5)
    .map((m) => `  [${m.priority}] ${m.category}.${m.field}${m.note ? ` — ${m.note}` : ''}`)
    .join('\n');

  const lines: string[] = [
    '# Supplier Profile Completeness Analysis',
    '',
    `Tenant: ${orgId}`,
    `Overall Completeness: ${(deterministicReport.overallCompleteness * 100).toFixed(0)}%`,
    '',
    '## Category Scores',
    categoryLines,
    '',
    '## Top Missing Fields',
    topMissing || '(none)',
    '',
    '## Task',
    'Based on the completeness analysis above, produce a JSON response with:',
    '1. A "reasoningSummary" that explains the overall profile state and the single most impactful action the supplier should take.',
    '2. "improvementActions" — ordered list of specific, concrete actions (most impactful first). Each action MUST reference a specific field or category.',
    '3. "trustSignalWarnings" — any buyer-trust concerns from the analysis (expired certs, missing stages, no SKUs, etc.).',
    '',
    'Respond with valid JSON only. No prose. No markdown.',
  ];

  return {
    prompt: lines.join('\n'),
    systemInstruction,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Run AI-backed supplier profile completeness inference.
 *
 * Phase architecture (HOTFIX-MODEL-TX-001):
 *   Phase 1: DB reads + context + rubric (outside tx)
 *   Phase 2: AI call (outside tx, pre-computed before runAiInference)
 *   Phase 3: DB writes (AiUsageMeter + ReasoningLog + AuditLog via runAiInference inside tx)
 *
 * Returns a discriminated union — never throws inference errors.
 * On parse failure, returns deterministic rubric report with reportParseError: true.
 */
export async function runSupplierProfileCompletenessInference(
  input: SupplierProfileCompletenessServiceInput
): Promise<SupplierProfileCompletenessServiceResult> {
  const { orgId, monthKey, requestId, idempotencyKey, userId, prisma, dbContext } = input;

  // ─── Phase 1: DB reads + context assembly + deterministic rubric ─────────────
  // Executed outside any Prisma tx (design §I.2, Phase 1)
  const contextResult = await buildSupplierProfileCompletenessContext(prisma, orgId);

  // Enforce forbidden field guard (design §J.2)
  assertNoForbiddenAiFields(contextResult.context);

  // Build deterministic rubric (Slice 2) — pure function, no IO
  const deterministicReport = buildSupplierProfileCompletenessRubric(contextResult);

  // Assemble prompt from rubric
  const { prompt, systemInstruction } = buildSupplierProfileCompletenessPrompt(
    deterministicReport,
    orgId
  );

  // ─── Phase 2 + Phase 3: AI call (outside tx) + audit writes (inside tx) ──────
  // runAiInference handles both phases atomically:
  //   - Phase 2: generateContent() is called OUTSIDE withDbContext (HOTFIX-MODEL-TX-001)
  //     in inferenceService's supplier-profile-completeness pre-computation block.
  //   - Phase 3: AiUsageMeter upsert + ReasoningLog + AuditLog writes run INSIDE withDbContext tx.
  // No direct AI SDK call needed here. inferenceService owns all AI + audit orchestration.
  const inferenceResult: AiInferenceResult = await runAiInference({
    orgId,
    taskType: 'supplier-profile-completeness',
    model: SUPPLIER_PROFILE_COMPLETENESS_MODEL,
    prompt,
    systemInstruction,
    preflightTokens: SUPPLIER_PROFILE_COMPLETENESS_PREFLIGHT_TOKENS,
    monthKey,
    requestId,
    idempotencyKey,
    userId,
    prisma,
    dbContext,
  });

  // ─── Parse AI enrichment response ────────────────────────────────────────────
  const parseResult = parseSupplierProfileCompletenessReport(
    inferenceResult.text,
    deterministicReport
  );

  if (!parseResult.ok) {
    // Parse error: return deterministic fallback + hadInferenceError=true
    return {
      ok: false,
      reportParseError: true,
      report: deterministicReport,
      reasoningLogId: inferenceResult.auditLogId,
      auditLogId: inferenceResult.auditLogId,
      hadInferenceError: true,
      humanReviewRequired: true,
    };
  }

  return {
    ok: true,
    report: parseResult.report,
    reasoningLogId: inferenceResult.auditLogId,
    auditLogId: inferenceResult.auditLogId,
    tokensUsed: inferenceResult.tokensUsed,
    costEstimateUSD: inferenceResult.costEstimateUSD,
    monthKey: inferenceResult.monthKey,
    hadInferenceError: inferenceResult.hadInferenceError,
    humanReviewRequired: true,
  };
}
