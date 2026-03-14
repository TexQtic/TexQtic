/**
 * inferenceService.ts — PW5-AI-TIS-EXTRACT
 *
 * Tenant Inference Service (TIS): encapsulates all AI orchestration for tenant-scoped
 * AI endpoints. Route handlers delegate here; this module owns:
 *
 *   - Budget enforcement (load policy, check preflight, upsert usage)
 *   - RAG retrieval + prompt augmentation  (insights task only)
 *   - Latency instrumentation (ragMetrics)
 *   - Gemini model invocation (generateContent)
 *   - Reasoning log + audit log writes (atomic within Prisma transaction)
 *   - AI event emission via aiEmitter.ts (best-effort, non-blocking, post-tx)
 *
 * RULES:
 *   - No behavioral changes from the original ai.ts orchestration logic
 *   - Reasoning log + audit log writes remain atomic (single Prisma transaction)
 *   - Event emission is always best-effort and never blocks the primary flow
 *   - No PII redaction, idempotency, or caching in this unit
 *   - Export:  runAiInference()
 *              isGenAiConfigured()
 *
 * SCOPE: PW5-AI-TIS-EXTRACT only.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import {
  loadTenantBudget,
  getUsage,
  enforceBudgetOrThrow,
  upsertUsage,
  estimateCostUSD,
  BudgetExceededError,
} from '../../lib/aiBudget.js';
import {
  buildAiInsightsReasoningAudit,
  buildAiNegotiationReasoningAudit,
} from '../../utils/audit.js';
import { runRagRetrieval } from './ragContextBuilder.js';
import {
  startTimer,
  markRetrievalStart,
  recordRetrievalLatency,
  markInferenceStart,
  recordInferenceLatency,
  recordTotalLatency,
} from './ragMetrics.js';
import { emitAiEventBestEffort } from '../../events/aiEmitter.js';

const AI_RATE_LIMIT_PER_MINUTE = 60;
const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

type TenantRateLimitWindow = {
  count: number;
  windowStart: number;
};

const tenantRequestWindows = new Map<string, TenantRateLimitWindow>();

export class AiRateLimitExceededError extends Error {
  constructor(public orgId: string) {
    super(`AI request rate limit exceeded for tenant ${orgId}`);
    this.name = 'AiRateLimitExceededError';
  }

  toJSON() {
    return {
      ok: false,
      error: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI request rate limit exceeded',
    };
  }
}

function enforceTenantRateLimit(orgId: string): void {
  const now = Date.now();
  const windowEntry = tenantRequestWindows.get(orgId);

  if (!windowEntry || now - windowEntry.windowStart >= AI_RATE_LIMIT_WINDOW_MS) {
    tenantRequestWindows.set(orgId, { count: 1, windowStart: now });
    return;
  }

  if (windowEntry.count >= AI_RATE_LIMIT_PER_MINUTE) {
    throw new AiRateLimitExceededError(orgId);
  }

  windowEntry.count += 1;
}

// ---------------------------------------------------------------------------
// Gemini client — initialised once at module load (server-side only)
// ---------------------------------------------------------------------------

let genAI: GoogleGenerativeAI | null = null;
try {
  if (config.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn('Gemini AI initialization failed - using fallback mode', error);
}

/**
 * Returns true when the Gemini client is configured and operational.
 * Used by the /api/ai/health route to report status.
 */
export function isGenAiConfigured(): boolean {
  return genAI !== null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * generateContent — wraps Gemini model invocation with timeout guard.
 *
 * Returns a degraded-mode result if genAI is not configured rather than
 * throwing, preserving the original degraded-mode semantics.
 *
 * Errors from the model call are caught and surfaced via hadInferenceError.
 */
async function generateContent(
  prompt: string,
  systemInstruction?: string,
  timeoutMs: number = 8000
): Promise<{ text: string; tokensUsed: number; hadInferenceError: boolean }> {
  if (!genAI) {
    return {
      text: 'AI service temporarily unavailable. Please configure GEMINI_API_KEY.',
      tokensUsed: 0,
      hadInferenceError: false,
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
    });

    // Race between AI call and timeout
    const aiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs)
    );

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    // Estimate tokens used based on response length
    // Gemini SDK doesn't always provide usage metadata
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);

    return {
      text,
      tokensUsed: estimatedTokens,
      hadInferenceError: false,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      text: 'AI service encountered an error. Please try again later.',
      tokensUsed: 0,
      hadInferenceError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Supported task types for runAiInference */
export type AiTaskType = 'insights' | 'negotiation-advice';

/**
 * Input for runAiInference.
 *
 * orgId          — contextTenantId (dbContext.orgId)
 * taskType       — determines orchestration path (RAG, audit builder, risk flags)
 * model          — Gemini model name (e.g. 'gemini-1.5-flash')
 * prompt         — assembled user/task prompt (without RAG context block)
 * systemInstruction — system-role instruction for the model
 * preflightTokens   — conservative token estimate used for budget preflight
 * monthKey       — YYYY-MM budget period (getMonthKey() from aiBudget)
 * requestId      — caller-generated trace ID
 * userId         — authenticated actor UUID (nullable)
 * prisma         — non-transactional PrismaClient (owns withDbContext + event persistence)
 * dbContext      — RLS database context (injected by databaseContextMiddleware)
 *
 * Task-specific (insights):
 *   tenantType, experience
 *
 * Task-specific (negotiation-advice):
 *   productName, targetPrice, quantity
 */
export interface AiInferenceInput {
  orgId: string;
  taskType: AiTaskType;
  model: string;
  prompt: string;
  systemInstruction: string;
  preflightTokens: number;
  monthKey: string;
  requestId: string;
  idempotencyKey?: string;
  userId: string | null;
  prisma: PrismaClient;
  dbContext: DatabaseContext;

  // insights-specific
  tenantType?: string;
  experience?: string;

  // negotiation-advice-specific
  productName?: string;
  targetPrice?: number;
  quantity?: number;
}

/**
 * Result returned to the route handler (after all orchestration completes).
 *
 * text              — model output (or degraded-mode message)
 * tokensUsed        — actual tokens consumed (estimated)
 * costEstimateUSD   — cost estimate for the request
 * monthKey          — budget period
 * auditLogId        — UUID of the created AuditLog row
 * inferenceLatencyMs — wall-clock model latency in milliseconds
 * hadInferenceError — true when model call failed (degraded response returned)
 * riskFlags         — populated for negotiation-advice task only
 */
export interface AiInferenceResult {
  text: string;
  tokensUsed: number;
  costEstimateUSD: number;
  monthKey: string;
  auditLogId: string;
  inferenceLatencyMs: number;
  hadInferenceError: boolean;
  riskFlags?: string[];
}

function normalizeIdempotencyKey(idempotencyKey?: string): string | undefined {
  const normalized = idempotencyKey?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function buildReasoningRequestId(requestId: string, idempotencyKey?: string): string {
  if (!idempotencyKey) {
    return requestId;
  }
  return `idem:${idempotencyKey}`;
}

function extractAuditMetadataValue(
  metadataJson: unknown,
  key: string
): string | number | undefined {
  if (!metadataJson || typeof metadataJson !== 'object' || Array.isArray(metadataJson)) {
    return undefined;
  }
  const value = (metadataJson as Record<string, unknown>)[key];
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return undefined;
}

async function findIdempotentReplay(
  input: AiInferenceInput,
  normalizedIdempotencyKey?: string
): Promise<AiInferenceResult | null> {
  if (!normalizedIdempotencyKey) {
    return null;
  }

  const replaySince = new Date(Date.now() - AI_IDEMPOTENCY_WINDOW_MS);
  const reasoningRequestId = buildReasoningRequestId(input.requestId, normalizedIdempotencyKey);

  return withDbContext(input.prisma, input.dbContext, async tx => {
    const existing = await tx.reasoningLog.findFirst({
      where: {
        tenantId: input.orgId,
        requestId: reasoningRequestId,
        createdAt: {
          gte: replaySince,
        },
      },
      include: {
        auditLogs: {
          where: {
            action: {
              in: ['AI_INSIGHTS', 'AI_NEGOTIATION_ADVICE'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!existing) {
      return null;
    }

    const linkedAudit = existing.auditLogs[0];
    const metadataMonthKey = extractAuditMetadataValue(linkedAudit?.metadataJson, 'monthKey');
    const metadataCost = extractAuditMetadataValue(linkedAudit?.metadataJson, 'costEstimateUSD');

    const text = existing.responseSummary ?? '';
    const tokensUsed = existing.tokensUsed;
    const costEstimateUSD =
      typeof metadataCost === 'number'
        ? metadataCost
        : estimateCostUSD(tokensUsed, input.model);

    const replayResult: AiInferenceResult = {
      text,
      tokensUsed,
      costEstimateUSD,
      monthKey: typeof metadataMonthKey === 'string' ? metadataMonthKey : input.monthKey,
      auditLogId: linkedAudit?.id ?? '',
      inferenceLatencyMs: 0,
      hadInferenceError: false,
    };

    if (input.taskType === 'negotiation-advice') {
      const riskFlags: string[] = [];
      const lowerAdvice = text.toLowerCase();
      if (lowerAdvice.includes('aggressive') || lowerAdvice.includes('ultimatum')) {
        riskFlags.push('AGGRESSIVE_TACTICS');
      }
      if (input.targetPrice && input.targetPrice < 10) {
        riskFlags.push('LOW_PRICE_THRESHOLD');
      }
      replayResult.riskFlags = riskFlags;
    }

    return replayResult;
  });
}

/**
 * runAiInference — primary TIS entry point.
 *
 * Orchestrates the complete AI inference lifecycle within a single Prisma
 * transaction (budget check → RAG → model call → reasoning/audit writes),
 * then emits best-effort AI domain events post-transaction.
 *
 * Throws BudgetExceededError when the tenant budget hard-stop is reached;
 * callers should catch this and return HTTP 429.
 *
 * All other errors propagate to the caller for HTTP 500 handling.
 */
export async function runAiInference(input: AiInferenceInput): Promise<AiInferenceResult> {
  const {
    orgId,
    taskType,
    model,
    prompt,
    systemInstruction,
    preflightTokens,
    monthKey,
    requestId,
    idempotencyKey,
    userId,
    prisma,
    dbContext,
  } = input;

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

  enforceTenantRateLimit(orgId);

  const existingResult = await findIdempotentReplay(input, normalizedIdempotencyKey);
  if (existingResult) {
    return existingResult;
  }

  const reasoningRequestId = buildReasoningRequestId(requestId, normalizedIdempotencyKey);

  let txResult: AiInferenceResult;

  try {
    // Execute orchestration within RLS-enforced transaction
    txResult = await withDbContext(prisma, dbContext, async tx => {
      // 1. Load budget policy
      const budget = await loadTenantBudget(tx, orgId);

      // 2. Get current usage
      const usage = await getUsage(tx, orgId, monthKey);

      // 3. Preflight budget check (conservative estimate)
      const preflightCost = estimateCostUSD(preflightTokens, model);
      enforceBudgetOrThrow(budget, usage, preflightTokens, preflightCost);

      if (taskType === 'insights') {
        // -----------------------------------------------------------------
        // INSIGHTS orchestration path (RAG + latency instrumentation)
        // -----------------------------------------------------------------

        // 4. RAG retrieval + prompt augmentation (G-028 A5/A7)
        const metricsHandle = startTimer();
        markRetrievalStart(metricsHandle);
        const ragResult = await runRagRetrieval(tx, orgId, prompt);
        recordRetrievalLatency(
          metricsHandle,
          ragResult.meta?.chunksInjected ?? 0,
          ragResult.meta?.topScore ?? null,
        );

        // Augment prompt with retrieved context block when available
        const finalPrompt = ragResult.contextBlock
          ? `${ragResult.contextBlock}\n\n${prompt}`
          : prompt;

        // 5. Generate content (AI call — uses augmented prompt when RAG is active)
        markInferenceStart(metricsHandle);
        const aiCallStart = Date.now();
        const aiResult = await generateContent(finalPrompt, systemInstruction);
        const inferenceLatencyMs = Date.now() - aiCallStart;
        recordInferenceLatency(metricsHandle);
        recordTotalLatency(metricsHandle);

        const { text, tokensUsed, hadInferenceError } = aiResult;

        // 6. Calculate actual cost
        const actualCost = estimateCostUSD(tokensUsed, model);

        // 7. Update usage meter
        await upsertUsage(tx, orgId, monthKey, tokensUsed, actualCost);

        // 8. Create reasoning_log (G-023) + linked audit log (same tx, atomic)
        const reasoningHash = createHash('sha256')
          .update(finalPrompt + text)
          .digest('hex');
        const reasoningLog = await tx.reasoningLog.create({
          data: {
            tenantId: orgId,
            requestId: reasoningRequestId,
            reasoningHash,
            model,
            promptSummary: finalPrompt.slice(0, 200),
            responseSummary: text,
            tokensUsed,
          },
        });
        const auditData = buildAiInsightsReasoningAudit({
          tenantId: orgId,
          userId: userId ?? null,
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId: reasoningRequestId,
          tenantType: input.tenantType,
          experience: input.experience,
          reasoningLogId: reasoningLog.id,
        });
        const auditLog = await tx.auditLog.create({ data: auditData });

        return {
          text,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          auditLogId: auditLog.id,
          inferenceLatencyMs,
          hadInferenceError,
        };
      } else {
        // -----------------------------------------------------------------
        // NEGOTIATION-ADVICE orchestration path
        // -----------------------------------------------------------------

        // 4. Generate content (AI call — no RAG, extended timeout)
        const aiCallStart = Date.now();
        const aiResult = await generateContent(prompt, systemInstruction, 10000);
        const inferenceLatencyMs = Date.now() - aiCallStart;
        const { text, tokensUsed, hadInferenceError } = aiResult;

        // 5. Calculate actual cost
        const actualCost = estimateCostUSD(tokensUsed, model);

        // 6. Update usage meter
        await upsertUsage(tx, orgId, monthKey, tokensUsed, actualCost);

        // 7. Create reasoning_log (G-023) + linked audit log (same tx, atomic)
        const reasoningHash = createHash('sha256')
          .update(prompt + text)
          .digest('hex');
        const reasoningLog = await tx.reasoningLog.create({
          data: {
            tenantId: orgId,
            requestId: reasoningRequestId,
            reasoningHash,
            model,
            promptSummary: prompt.slice(0, 200),
            responseSummary: text,
            tokensUsed,
          },
        });
        const auditData = buildAiNegotiationReasoningAudit({
          tenantId: orgId,
          userId: userId ?? null,
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId: reasoningRequestId,
          productName: input.productName,
          targetPrice: input.targetPrice,
          quantity: input.quantity,
          reasoningLogId: reasoningLog.id,
        });
        const auditLog = await tx.auditLog.create({ data: auditData });

        // 8. Risk detection
        const riskFlags: string[] = [];
        const lowerAdvice = text.toLowerCase();
        if (lowerAdvice.includes('aggressive') || lowerAdvice.includes('ultimatum')) {
          riskFlags.push('AGGRESSIVE_TACTICS');
        }
        if (input.targetPrice && input.targetPrice < 10) {
          riskFlags.push('LOW_PRICE_THRESHOLD');
        }

        return {
          text,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          auditLogId: auditLog.id,
          inferenceLatencyMs,
          hadInferenceError,
          riskFlags,
        };
      }
    });
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      // PW5-AI-EMITTER: emit ai.inference.budget_exceeded (sink-only, no auditLogId)
      void emitAiEventBestEffort(
        'ai.inference.budget_exceeded',
        {
          orgId: error.tenantId,
          budgetType: 'tokens',
          limitAmount: error.limits.tokens,
          currentUsage: error.usage.tokens,
        },
        { orgId: error.tenantId }
      );
      throw error; // rethrow for route to translate into HTTP 429
    }

    // Unexpected error path — emit ai.inference.error (sink-only) then rethrow
    // for route to translate into HTTP 500
    void emitAiEventBestEffort(
      'ai.inference.error',
      { orgId, taskType, model, errorCode: 'INTERNAL_ERROR' },
      { orgId }
    );
    throw error;
  }

  // --------------------------------------------------------------------------
  // Post-transaction: best-effort AI event emission (non-blocking)
  // --------------------------------------------------------------------------
  // PW5-AI-EMITTER: emit ai.inference.generate or ai.inference.error
  // Persistence: auditLog row is committed — safe to link via storeEventBestEffort.
  void emitAiEventBestEffort(
    txResult.hadInferenceError ? 'ai.inference.error' : 'ai.inference.generate',
    txResult.hadInferenceError
      ? { orgId, taskType, model, errorCode: 'AI_GENERATION_FAILED' }
      : { orgId, taskType, model, latencyMs: txResult.inferenceLatencyMs },
    { orgId, auditLogId: txResult.auditLogId, prisma }
  );

  return txResult;
}
