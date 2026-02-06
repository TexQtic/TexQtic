import type { FastifyPluginAsync } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { sendSuccess, sendBadRequest } from '../utils/response.js';
import { getTenantContext } from '../lib/tenantContext.js';

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

/**
 * Audit log helper (Phase 3A: graceful fallback if DB not ready)
 */
function logAuditEntry(
  tenantId: string | null,
  action: string,
  metadata: Record<string, any>,
  logger: any
) {
  // TODO Phase 3B: Write to audit_logs table when DB ready
  // For now: structured server log
  logger.info(
    {
      audit: {
        tenantId,
        action,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
    'AI_AUDIT_LOG'
  );
}

/**
 * Generate AI content with timeout and error handling
 */
async function generateContent(
  prompt: string,
  systemInstruction?: string,
  timeoutMs: number = 8000
): Promise<string> {
  if (!genAI) {
    return 'AI service temporarily unavailable. Please configure GEMINI_API_KEY.';
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
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI generation error:', error);
    return 'AI service encountered an error. Please try again later.';
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
   */
  fastify.get('/insights', async (request, reply) => {
    const { tenantId, realm } = getTenantContext(request);
    const { tenantType, experience } = request.query as {
      tenantType?: string;
      experience?: string;
    };

    // Log audit entry
    logAuditEntry(tenantId, 'ai.insights.request', { tenantType, experience, realm }, fastify.log);

    // Build prompt
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

    // Generate content
    const insightText = await generateContent(prompt, systemInstruction);

    return sendSuccess(reply, {
      insightText,
      updatedAt: new Date().toISOString(),
      cached: false, // TODO Phase 3B: implement caching
    });
  });

  /**
   * POST /api/ai/negotiation-advice
   * Generate negotiation strategy advice
   *
   * Body: { productName?, targetPrice?, quantity?, context? }
   * Response: { ok: true, data: { adviceText: string, riskFlags: string[], updatedAt: string } }
   */
  fastify.post('/negotiation-advice', async (request, reply) => {
    const { tenantId, realm } = getTenantContext(request);

    // Validate body
    const parseResult = negotiationAdviceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendBadRequest(reply, 'Invalid request body', parseResult.error.errors);
    }

    const { productName, targetPrice, quantity, context } = parseResult.data;

    // Log audit entry
    logAuditEntry(
      tenantId,
      'ai.negotiation.request',
      { productName, targetPrice, quantity, hasContext: !!context, realm },
      fastify.log
    );

    // Build prompt
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

    // Generate content
    const adviceText = await generateContent(prompt, systemInstruction, 10000);

    // Simple risk detection (upgrade in Phase 3B)
    const riskFlags: string[] = [];
    const lowerAdvice = adviceText.toLowerCase();
    if (lowerAdvice.includes('aggressive') || lowerAdvice.includes('ultimatum')) {
      riskFlags.push('AGGRESSIVE_TACTICS');
    }
    if (targetPrice && targetPrice < 10) {
      riskFlags.push('LOW_PRICE_THRESHOLD');
    }

    return sendSuccess(reply, {
      adviceText,
      riskFlags,
      updatedAt: new Date().toISOString(),
    });
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
