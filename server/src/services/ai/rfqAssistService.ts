/**
 * rfqAssistService.ts — RFQ Assist AI Service
 *
 * Orchestrates the AI-assisted RFQ field suggestion flow:
 *   1. Builds the AI prompt from the assembled RFQAssistantContext
 *   2. Calls runAiInference({ taskType: 'rfq-assist', ... })
 *   3. Parses model output via parseRfqAssistSuggestions()
 *   4. Returns structured suggestions + metadata
 *
 * Implements TECS-AI-RFQ-ASSISTANT-MVP-001 Section I (service wrapper).
 *
 * RULES:
 * - No direct DB access — relies on inferenceService for all Prisma + audit writes.
 * - On parse failure, returns { suggestionsParseError: true } — never throws.
 * - humanConfirmationRequired: true is always echoed in the return value.
 * - AI does NOT write to the rfqs table. Suggestions only.
 *
 * @module rfqAssistService
 */

import type { PrismaClient } from '@prisma/client';
import type { DatabaseContext } from '../../lib/database-context.js';
import {
  runAiInference,
  type AiInferenceResult,
} from './inferenceService.js';
import type { RFQAssistantContext } from './aiContextPacks.js';
import {
  parseRfqAssistSuggestions,
  type RfqAssistSuggestions,
} from './rfqAssistSuggestions.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const RFQ_ASSIST_PREFLIGHT_TOKENS = 2000 as const;
export const RFQ_ASSIST_MODEL = 'gemini-1.5-flash' as const;
export const RFQ_ASSIST_TIMEOUT_MS = 10_000 as const;

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface RfqAssistServiceInput {
  /** Validated, PII-cleaned context pack */
  context: RFQAssistantContext;
  /** Budget period key (YYYY-MM from getMonthKey()) */
  monthKey: string;
  /** Caller-generated trace requestId */
  requestId: string;
  /** Optional idempotency key from HTTP header */
  idempotencyKey?: string;
  /** Authenticated actor userId (nullable) */
  userId: string | null;
  /** Non-transactional PrismaClient (passed through to inferenceService) */
  prisma: PrismaClient;
  /** RLS database context (injected by databaseContextMiddleware) */
  dbContext: DatabaseContext;
}

export type RfqAssistServiceOk = {
  ok: true;
  suggestions: RfqAssistSuggestions;
  reasoningLogId: string;
  auditLogId: string;
  tokensUsed: number;
  costEstimateUSD: number;
  monthKey: string;
  hadInferenceError: boolean;
  humanConfirmationRequired: true;
};

export type RfqAssistServiceParseError = {
  ok: false;
  suggestionsParseError: true;
  rawText: string;
  reasoningLogId: string;
  auditLogId: string;
  hadInferenceError: boolean;
  humanConfirmationRequired: true;
};

export type RfqAssistServiceResult = RfqAssistServiceOk | RfqAssistServiceParseError;

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build the AI prompt from the RFQAssistantContext.
 * Price, PII, and escrow data are constitutionally absent from the context pack.
 */
function buildRfqAssistPrompt(ctx: RFQAssistantContext): { prompt: string; systemInstruction: string } {
  const systemInstruction =
    'You are a B2B textile trade assistant helping buyers complete RFQ (Request for Quote) requirements. ' +
    'Given the current requirement state and catalog item context, suggest values for the missing or incomplete fields. ' +
    'Respond ONLY with a valid JSON object. No prose. No markdown fences. No explanation outside the JSON. ' +
    'The JSON must contain ONLY these fields: ' +
    '"requirementTitle" (string, max 200 chars, or null), ' +
    '"quantityUnit" (string "METERS"|"KG"|"PIECES"|"YARDS"|"SETS"|null), ' +
    '"urgency" ("STANDARD"|"URGENT"|"FLEXIBLE"|null), ' +
    '"sampleRequired" (boolean or null), ' +
    '"deliveryCountry" (ISO 3166-1 alpha-3 string or null), ' +
    '"stageRequirementAttributes" (object with stage-specific keys or null), ' +
    '"reasoning" (string, max 200 chars, internal explanation for suggestions). ' +
    'Do not suggest price, payment terms, delivery location, or any financial data.';

  const lines: string[] = [
    '# RFQ Requirement Assistance Request',
    '',
    `Catalog Item: ${ctx.catalogItemText}`,
    `Catalog Stage: ${ctx.catalogItemStage ?? 'unknown'}`,
    `Completeness Score: ${(ctx.catalogCompletenessScore * 100).toFixed(0)}%`,
    '',
    '## Current Requirement State',
    ctx.structuredRequirementText || '(no fields set yet)',
    '',
    '## Task',
    'Suggest improvements or missing values for the RFQ fields listed below. ' +
    'Only suggest fields where you have high confidence the suggestion is appropriate ' +
    'for this catalog item and stage. Return null for fields you cannot confidently suggest.',
  ];

  return {
    prompt: lines.join('\n'),
    systemInstruction,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Run AI-assisted RFQ field suggestion inference.
 *
 * Returns a discriminated union — never throws (inference errors are returned
 * as hadInferenceError=true with the raw degraded text for logging).
 */
export async function runRfqAssistInference(
  input: RfqAssistServiceInput,
): Promise<RfqAssistServiceResult> {
  const { context, monthKey, requestId, idempotencyKey, userId, prisma, dbContext } = input;

  const { prompt, systemInstruction } = buildRfqAssistPrompt(context);

  let inferenceResult: AiInferenceResult;
  inferenceResult = await runAiInference({
    orgId: context.buyerOrgId,
    taskType: 'rfq-assist',
    model: RFQ_ASSIST_MODEL,
    prompt,
    systemInstruction,
    preflightTokens: RFQ_ASSIST_PREFLIGHT_TOKENS,
    monthKey,
    requestId,
    idempotencyKey,
    userId,
    prisma,
    dbContext,
    rfqId: context.rfqId,
    catalogItemId: context.catalogItemId,
    catalogItemStage: context.catalogItemStage,
  });

  const parseResult = parseRfqAssistSuggestions(inferenceResult.text);

  if (!parseResult.ok) {
    return {
      ok: false,
      suggestionsParseError: true,
      rawText: inferenceResult.text,
      reasoningLogId: inferenceResult.auditLogId, // auditLogId used as trace proxy
      auditLogId: inferenceResult.auditLogId,
      hadInferenceError: inferenceResult.hadInferenceError,
      humanConfirmationRequired: true,
    };
  }

  return {
    ok: true,
    suggestions: parseResult.suggestions,
    reasoningLogId: inferenceResult.auditLogId, // auditLogId as trace proxy
    auditLogId: inferenceResult.auditLogId,
    tokensUsed: inferenceResult.tokensUsed,
    costEstimateUSD: inferenceResult.costEstimateUSD,
    monthKey: inferenceResult.monthKey,
    hadInferenceError: inferenceResult.hadInferenceError,
    humanConfirmationRequired: true,
  };
}
