import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendSuccess, sendValidationError } from '../utils/response.js';
import { getTenantContext } from '../lib/tenantContext.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import { getMonthKey, BudgetExceededError } from '../lib/aiBudget.js';
import { PrismaClient } from '@prisma/client';
import {
  runAiInference,
  isGenAiConfigured,
} from '../services/ai/inferenceService.js';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

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

// ---------------------------------------------------------------------------
// NOTE: generateContent, genAI init, orchestration logic, RAG retrieval,
// latency metrics, reasoning/audit log writes, and event emission have all
// been extracted to server/src/services/ai/inferenceService.ts
// (PW5-AI-TIS-EXTRACT). Route handlers below are HTTP-concern only.
// ---------------------------------------------------------------------------

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
   *
   * Orchestration delegated to inferenceService.runAiInference (PW5-AI-TIS-EXTRACT).
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

      // Build prompt (HTTP-layer concern: assemble task-specific prompt text)
      const basePrompt = 'Provide a brief market trend analysis';
      const contextParts: string[] = [];
      if (tenantType) contextParts.push(`for a ${tenantType} platform`);
      if (experience) contextParts.push(`focusing on ${experience}`);
      const prompt =
        contextParts.length > 0
          ? `${basePrompt} ${contextParts.join(' ')}.`
          : `${basePrompt} for a global commerce platform.`;

      const systemInstruction =
        'You are a strategic AI advisor for a multi-tenant global commerce platform. ' +
        'Provide architectural and market insights concisely in 2-3 sentences.';

      // Delegate all orchestration to TIS
      const result = await runAiInference({
        orgId: dbContext.orgId,
        taskType: 'insights',
        model,
        prompt,
        systemInstruction,
        preflightTokens: AI_PREFLIGHT_TOKENS_INSIGHTS,
        monthKey,
        requestId,
        userId: userId ?? null,
        prisma,
        dbContext,
        tenantType,
        experience,
      });

      // HTTP response headers
      reply.header('X-AI-Month', result.monthKey);
      reply.header('X-AI-Tokens-Used', result.tokensUsed.toString());
      reply.header('X-AI-Cost-USD', result.costEstimateUSD.toFixed(4));

      return sendSuccess(reply, {
        insightText: result.text,
        updatedAt: new Date().toISOString(),
        cached: false,
      });
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return reply.code(429).send(error.toJSON());
      }
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
   *
   * Orchestration delegated to inferenceService.runAiInference (PW5-AI-TIS-EXTRACT).
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

      // Build prompt (HTTP-layer concern: assemble task-specific prompt text)
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

      // Delegate all orchestration to TIS
      const result = await runAiInference({
        orgId: dbContext.orgId,
        taskType: 'negotiation-advice',
        model,
        prompt,
        systemInstruction,
        preflightTokens: AI_PREFLIGHT_TOKENS_NEGOTIATION,
        monthKey,
        requestId,
        userId: userId ?? null,
        prisma,
        dbContext,
        productName,
        targetPrice,
        quantity,
      });

      // HTTP response headers
      reply.header('X-AI-Month', result.monthKey);
      reply.header('X-AI-Tokens-Used', result.tokensUsed.toString());
      reply.header('X-AI-Cost-USD', result.costEstimateUSD.toFixed(4));

      return sendSuccess(reply, {
        adviceText: result.text,
        riskFlags: result.riskFlags ?? [],
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return reply.code(429).send(error.toJSON());
      }
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
   * AI service health check — tenant-auth protected (VER-008 remediation)
   */
  fastify.get('/health', { onRequest: [tenantAuthMiddleware] }, async (_request, reply) => {
    return sendSuccess(reply, {
      status: isGenAiConfigured() ? 'operational' : 'degraded',
      provider: 'gemini-1.5-flash',
      configured: config.GEMINI_API_KEY ? true : false,
      timestamp: new Date().toISOString(),
    });
  });
};

export default aiRoutes;
