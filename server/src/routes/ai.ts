import type { FastifyPluginAsync } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { config } from '../config/index.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';
import { getTenantContext } from '../lib/tenantContext.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import { withDbContext } from '../lib/database-context.js';
import {
  loadTenantBudget,
  getUsage,
  enforceBudgetOrThrow,
  upsertUsage,
  estimateCostUSD,
  getMonthKey,
  BudgetExceededError,
} from '../lib/aiBudget.js';
import {
  buildAiInsightsReasoningAudit,
  buildAiNegotiationReasoningAudit,
} from '../utils/audit.js';
import { runRagRetrieval } from '../services/ai/ragContextBuilder.js';
import {
  startTimer,
  markRetrievalStart,
  recordRetrievalLatency,
  markInferenceStart,
  recordInferenceLatency,
  recordTotalLatency,
} from '../services/ai/ragMetrics.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Gemini client (server-side only)
let genAI: GoogleGenerativeAI | null = null;
try {
  if (config.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn('Gemini AI initialization failed - using fallback mode', error);
}

// Request schemas
const negotiationAdviceSchema = z.object({
  productName: z.string().optional(),
  targetPrice: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  context: z.string().max(500).optional(),
});

// Configuration
const AI_PREFLIGHT_TOKENS_INSIGHTS = Number.parseInt(
  process.env.AI_PREFLIGHT_TOKENS_INSIGHTS || '1500',
  10
);
const AI_PREFLIGHT_TOKENS_NEGOTIATION = Number.parseInt(
  process.env.AI_PREFLIGHT_TOKENS_NEGOTIATION || '2500',
  10
);

/**
 * Generate AI content with timeout and token usage tracking
 */
async function generateContent(
  prompt: string,
  systemInstruction?: string,
  timeoutMs: number = 8000
): Promise<{ text: string; tokensUsed: number }> {
  if (!genAI) {
    return {
      text: 'AI service temporarily unavailable. Please configure GEMINI_API_KEY.',
      tokensUsed: 0,
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
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      text: 'AI service encountered an error. Please try again later.',
      tokensUsed: 0,
    };
  }
}

const aiRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/ai/insights
   * Generate platform insights for tenant
   *
   * Query params:
   *   - tenantType (optional): B2B, B2C, AGGREGATOR, WHITE_LABEL
   *   - experience (optional): context hint
   *
   * Response: { ok: true, data: { insightText: string, updatedAt: string } }
   *
   * Phase 3B: Budget enforcement + usage metering + audit logging
   */
  fastify.get('/insights', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { tenantId, realm: _realm, userId } = getTenantContext(request);
    const { tenantType, experience } = request.query as {
      tenantType?: string;
      experience?: string;
    };

    // Require tenant context for tenant-scoped endpoint
    if (!tenantId) {
      return reply.code(401).send({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Tenant context required for AI insights',
      });
    }

    const requestId = `insights-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const monthKey = getMonthKey();
    const model = 'gemini-1.5-flash';

    try {
      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return reply.code(401).send({ ok: false, error: 'UNAUTHORIZED', message: 'Database context missing' });
      }
      const contextTenantId = dbContext.orgId;

      // Execute within tenant DB context (RLS enforced)
      const result = await withDbContext(prisma, dbContext, async tx => {
        // 1. Load budget policy
        const budget = await loadTenantBudget(tx, contextTenantId);

        // 2. Get current usage
        const usage = await getUsage(tx, contextTenantId, monthKey);

        // 3. Preflight budget check (conservative estimate)
        const preflightTokens = AI_PREFLIGHT_TOKENS_INSIGHTS;
        const preflightCost = estimateCostUSD(preflightTokens, model);
        enforceBudgetOrThrow(budget, usage, preflightTokens, preflightCost);

        // 4. Build prompt
        const basePrompt = 'Provide a brief market trend analysis';
        const contextParts: string[] = [];

        if (tenantType) {
          contextParts.push(`for a ${tenantType} platform`);
        }
        if (experience) {
          contextParts.push(`focusing on ${experience}`);
        }

        const prompt =
          contextParts.length > 0
            ? `${basePrompt} ${contextParts.join(' ')}.`
            : `${basePrompt} for a global commerce platform.`;

        const systemInstruction =
          'You are a strategic AI advisor for a multi-tenant global commerce platform. ' +
          'Provide architectural and market insights concisely in 2-3 sentences.';

        // 4.5 G-028 A5: RAG retrieval + prompt injection
        // Gated by feature flag OP_G028_VECTOR_ENABLED. Fail-safe: errors fall back to zero-shot.
        // Builds a real Gemini embedding, queries document_embeddings, injects context block.
        // Metadata (no chunk content) logged to reasoning_logs as model="vector-rag/g028-a5".
        //
        // G-028 A7: Latency instrumentation (read-only; logged to console; not persisted).
        const metricsHandle = startTimer();
        markRetrievalStart(metricsHandle);
        const ragResult = await runRagRetrieval(tx, contextTenantId, prompt);
        recordRetrievalLatency(
          metricsHandle,
          ragResult.meta?.chunksInjected ?? 0,
          ragResult.meta?.topScore ?? null,
        );

        // Augment prompt: inject retrieved context block before the original user prompt.
        // Falls back to the original prompt if retrieval is skipped or returns no results.
        const finalPrompt = ragResult.contextBlock
          ? `${ragResult.contextBlock}\n\n${prompt}`
          : prompt;

        // 5. Generate content (AI call — uses augmented prompt when RAG is active)
        markInferenceStart(metricsHandle);
        const { text: insightText, tokensUsed } = await generateContent(finalPrompt, systemInstruction);
        recordInferenceLatency(metricsHandle);
        recordTotalLatency(metricsHandle);

        // 6. Calculate actual cost
        const actualCost = estimateCostUSD(tokensUsed, model);

        // 7. Update usage meter
        await upsertUsage(tx, contextTenantId, monthKey, tokensUsed, actualCost);

        // 8. Create reasoning_log (G-023) + linked audit log (same tx, atomic)
        const auditUserId = userId ?? null;
        const reasoningHash = createHash('sha256')
          .update(finalPrompt + insightText)
          .digest('hex');
        const reasoningLog = await tx.reasoningLog.create({
          data: {
            tenantId: contextTenantId,
            requestId,
            reasoningHash,
            model,
            promptSummary: finalPrompt.slice(0, 200),
            responseSummary: insightText.slice(0, 200),
            tokensUsed,
          },
        });
        const auditData = buildAiInsightsReasoningAudit({
          tenantId: contextTenantId,
          userId: auditUserId,
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId,
          tenantType,
          experience,
          reasoningLogId: reasoningLog.id,
        });
        await tx.auditLog.create({ data: auditData });

        return {
          insightText,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
        };
      });

      // Add response headers for debugging
      reply.header('X-AI-Month', result.monthKey);
      reply.header('X-AI-Tokens-Used', result.tokensUsed.toString());
      reply.header('X-AI-Cost-USD', result.costEstimateUSD.toFixed(4));

      return sendSuccess(reply, {
        insightText: result.insightText,
        updatedAt: new Date().toISOString(),
        cached: false,
      });
    } catch (error) {
      // Handle budget exceeded error
      if (error instanceof BudgetExceededError) {
        return reply.code(429).send(error.toJSON());
      }

      // Log and return generic error
      console.error('[AI Insights] Error:', error);
      return reply.code(500).send({
        ok: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate insights',
      });
    }
  });

  /**
   * POST /api/ai/negotiation-advice
   * Generate negotiation strategy advice
   *
   * Body: { productName?, targetPrice?, quantity?, context? }
   * Response: { ok: true, data: { adviceText: string, riskFlags: string[], updatedAt: string } }
   *
   * Phase 3B: Budget enforcement + usage metering + audit logging
   */
  fastify.post('/negotiation-advice', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { tenantId, realm: _realm, userId } = getTenantContext(request);

    // Require tenant context
    if (!tenantId) {
      return reply.code(401).send({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Tenant context required for AI negotiation advice',
      });
    }

    // Validate body
    const parseResult = negotiationAdviceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { productName, targetPrice, quantity, context } = parseResult.data;

    const requestId = `negotiation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const monthKey = getMonthKey();
    const model = 'gemini-1.5-flash';

    try {
      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return reply.code(401).send({ ok: false, error: 'UNAUTHORIZED', message: 'Database context missing' });
      }
      const contextTenantId = dbContext.orgId;

      // Execute within tenant DB context (RLS enforced)
      const result = await withDbContext(prisma, dbContext, async tx => {
        // 1. Load budget policy
        const budget = await loadTenantBudget(tx, contextTenantId);

        // 2. Get current usage
        const usage = await getUsage(tx, contextTenantId, monthKey);

        // 3. Preflight budget check (conservative estimate)
        const preflightTokens = AI_PREFLIGHT_TOKENS_NEGOTIATION;
        const preflightCost = estimateCostUSD(preflightTokens, model);
        enforceBudgetOrThrow(budget, usage, preflightTokens, preflightCost);

        // 4. Build prompt
        let prompt = 'Generate 3 strategic negotiation points for a B2B buyer.';
        const details: string[] = [];

        if (productName) details.push(`Product: ${productName}`);
        if (targetPrice) details.push(`Target Price: $${targetPrice}`);
        if (quantity) details.push(`Quantity: ${quantity} units`);
        if (context) details.push(`Context: ${context}`);

        if (details.length > 0) {
          prompt = `${details.join('. ')}. ${prompt}`;
        }

        const systemInstruction =
          'You are a B2B negotiation advisor. Provide 3 concise, actionable negotiation tactics. ' +
          'Flag any high-risk strategies.';

        // 5. Generate content (AI call)
        const { text: adviceText, tokensUsed } = await generateContent(
          prompt,
          systemInstruction,
          10000
        );

        // 6. Calculate actual cost
        const actualCost = estimateCostUSD(tokensUsed, model);

        // 7. Update usage meter
        await upsertUsage(tx, contextTenantId, monthKey, tokensUsed, actualCost);

        const auditUserId = userId ?? null;
        // 8. Create reasoning_log (G-023) + linked audit log (same tx, atomic)
        const negReasoningHash = createHash('sha256')
          .update(prompt + adviceText)
          .digest('hex');
        const negReasoningLog = await tx.reasoningLog.create({
          data: {
            tenantId: contextTenantId,
            requestId,
            reasoningHash: negReasoningHash,
            model,
            promptSummary: prompt.slice(0, 200),
            responseSummary: adviceText.slice(0, 200),
            tokensUsed,
          },
        });
        const negAuditData = buildAiNegotiationReasoningAudit({
          tenantId: contextTenantId,
          userId: auditUserId,
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId,
          productName,
          targetPrice,
          quantity,
          reasoningLogId: negReasoningLog.id,
        });
        await tx.auditLog.create({ data: negAuditData });

        // 9. Risk detection
        const riskFlags: string[] = [];
        const lowerAdvice = adviceText.toLowerCase();
        if (lowerAdvice.includes('aggressive') || lowerAdvice.includes('ultimatum')) {
          riskFlags.push('AGGRESSIVE_TACTICS');
        }
        if (targetPrice && targetPrice < 10) {
          riskFlags.push('LOW_PRICE_THRESHOLD');
        }

        return {
          adviceText,
          riskFlags,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
        };
      });

      // Add response headers for debugging
      reply.header('X-AI-Month', result.monthKey);
      reply.header('X-AI-Tokens-Used', result.tokensUsed.toString());
      reply.header('X-AI-Cost-USD', result.costEstimateUSD.toFixed(4));

      return sendSuccess(reply, {
        adviceText: result.adviceText,
        riskFlags: result.riskFlags,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Handle budget exceeded error
      if (error instanceof BudgetExceededError) {
        return reply.code(429).send(error.toJSON());
      }

      // Log and return generic error
      console.error('[AI Negotiation] Error:', error);
      return reply.code(500).send({
        ok: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate negotiation advice',
      });
    }
  });

  /**
   * GET /api/ai/health
   * AI service health check
   */
  fastify.get('/health', async (_request, reply) => {
    return sendSuccess(reply, {
      status: genAI ? 'operational' : 'degraded',
      provider: 'gemini-1.5-flash',
      configured: config.GEMINI_API_KEY ? true : false,
      timestamp: new Date().toISOString(),
    });
  });
};

export default aiRoutes;
