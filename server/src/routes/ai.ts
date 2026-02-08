import type { FastifyPluginAsync } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { sendSuccess, sendBadRequest } from '../utils/response.js';
import { getTenantContext } from '../lib/tenantContext.js';
import { withTenantDb } from '../lib/dbContext.js';
import {
  loadTenantBudget,
  getUsage,
  enforceBudgetOrThrow,
  upsertUsage,
  estimateCostUSD,
  getMonthKey,
  BudgetExceededError,
} from '../lib/aiBudget.js';
import { writeAuditLog, createAiInsightsAudit, createAiNegotiationAudit } from '../lib/auditLog.js';
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

type NegotiationAdviceInput = z.infer<typeof negotiationAdviceSchema>;

// Configuration
const AI_PREFLIGHT_TOKENS_INSIGHTS = parseInt(
  process.env.AI_PREFLIGHT_TOKENS_INSIGHTS || '1500',
  10
);
const AI_PREFLIGHT_TOKENS_NEGOTIATION = parseInt(
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
  fastify.get('/insights', async (request, reply) => {
    const { tenantId, realm, userId } = getTenantContext(request);
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

    const requestId = `insights-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const monthKey = getMonthKey();
    const model = 'gemini-1.5-flash';

    try {
      // Execute within tenant DB context (RLS enforced)
      const result = await withTenantDb(prisma, tenantId, realm === 'admin', async tx => {
        // 1. Load budget policy
        const budget = await loadTenantBudget(tx, tenantId);

        // 2. Get current usage
        const usage = await getUsage(tx, tenantId, monthKey);

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

        // 5. Generate content (AI call)
        const { text: insightText, tokensUsed } = await generateContent(prompt, systemInstruction);

        // 6. Calculate actual cost
        const actualCost = estimateCostUSD(tokensUsed, model);

        // 7. Update usage meter
        await upsertUsage(tx, tenantId, monthKey, tokensUsed, actualCost);

        // 8. Write audit log (DB-backed, append-only)
        const auditEntry = createAiInsightsAudit(tenantId, userId, {
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId,
          tenantType,
          experience,
        });
        await writeAuditLog(tx, auditEntry);

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
  fastify.post('/negotiation-advice', async (request, reply) => {
    const { tenantId, realm, userId } = getTenantContext(request);

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
      return sendBadRequest(reply, 'Invalid request body', parseResult.error.errors);
    }

    const { productName, targetPrice, quantity, context } = parseResult.data;

    const requestId = `negotiation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const monthKey = getMonthKey();
    const model = 'gemini-1.5-flash';

    try {
      // Execute within tenant DB context (RLS enforced)
      const result = await withTenantDb(prisma, tenantId, realm === 'admin', async tx => {
        // 1. Load budget policy
        const budget = await loadTenantBudget(tx, tenantId);

        // 2. Get current usage
        const usage = await getUsage(tx, tenantId, monthKey);

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
        await upsertUsage(tx, tenantId, monthKey, tokensUsed, actualCost);

        // 8. Write audit log (DB-backed, append-only)
        const auditEntry = createAiNegotiationAudit(tenantId, userId, {
          model,
          tokensUsed,
          costEstimateUSD: actualCost,
          monthKey,
          requestId,
          productName,
          targetPrice,
          quantity,
        });
        await writeAuditLog(tx, auditEntry);

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
