/**
 * control/ai.g028.ts — PW5-G028-C1-CONTROL-PLANE-AI-INSIGHTS
 *
 * Control-plane AI routes — Slice 1.
 * Mounted under /api/control/ai/* by the parent controlRoutes plugin.
 *
 * Routes:
 *   GET  /health   → /api/control/ai/health
 *   POST /insights → /api/control/ai/insights
 *
 * Auth posture:
 *   - Parent controlRoutes plugin enforces adminAuthMiddleware globally (all
 *     control-plane routes require a valid admin JWT).
 *   - Each route in this file additionally enforces requireAdminRole('SUPER_ADMIN')
 *     as a preHandler to gate on the highest admin role.
 *   - No identity, role, realm, or orgId field from the client body is trusted.
 *
 * Slice 1 guarantees:
 *   - No per-org targeting behaviour
 *   - No tenant AI route changes
 *   - No ai.control.* event-domain expansion
 *   - No schema / migration changes
 *   - No frontend wiring
 *   - Reasoning persisted in admin audit metadataJson, not reasoning_logs
 *
 * SCOPE: PW5-G028-C1 only.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import {
  isGenAiConfigured,
  runControlPlaneInsight,
} from '../../services/ai/controlPlaneInferenceService.js';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Request schema — minimal for Slice 1
// ---------------------------------------------------------------------------

/**
 * POST /api/control/ai/insights request body.
 *
 * Slice 1 is intentionally minimal:
 *   - prompt  : The platform-level question or directive.
 *   - focus   : Optional context hint (e.g. 'platform-health', 'usage-trends').
 *
 * Fields NOT accepted in Slice 1 (rejected silently via schema boundary):
 *   - orgId / tenantId / role / realm — all identity signals from client are forbidden
 *   - per-org targeting parameters
 */
const cpInsightsBodySchema = z.object({
  prompt: z.string().min(1).max(2_000),
  focus: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const controlPlaneAiRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/ai/health
   *
   * Admin-only health probe for the control-plane AI surface.
   * Reports Gemini configuration status and route reachability.
   * No model invocation performed. SUPER_ADMIN required.
   *
   * Response shape:
   *   {
   *     ok: true,
   *     data: {
   *       controlPlaneAi: {
   *         status: 'available' | 'degraded',
   *         configured: boolean,
   *         slice: 'G028-C1',
   *         checkedAt: ISO8601
   *       }
   *     }
   *   }
   */
  fastify.get(
    '/health',
    { preHandler: requireAdminRole('SUPER_ADMIN') },
    async (_request, reply) => {
      const configured = isGenAiConfigured();

      return sendSuccess(reply, {
        controlPlaneAi: {
          status: configured ? 'available' : 'degraded',
          configured,
          slice: 'G028-C1',
          checkedAt: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /api/control/ai/insights
   *
   * Execute a platform-level AI insight request for SUPER_ADMIN.
   *
   * Auth:
   *   - adminAuthMiddleware (parent plugin) validates admin JWT.
   *   - requireAdminRole('SUPER_ADMIN') gates on role from JWT.
   *   - request.adminId is JWT-sourced — NEVER from client body.
   *
   * Guarantees:
   *   - PII redacted from prompt before model invocation.
   *   - Model output scanned; PII-containing output is suppressed.
   *   - Admin audit record written (reasoning summary in metadataJson).
   *   - No writes to reasoning_logs.
   *   - No per-org execution.
   *   - No client identity signal trusted.
   *
   * Response shape:
   *   {
   *     ok: true,
   *     data: {
   *       insightText: string,
   *       requestId: string,
   *       meta: {
   *         model, tokensUsed, inferenceLatencyMs,
   *         hadInferenceError, piiRedacted, outputPiiDetected, slice
   *       }
   *     }
   *   }
   */
  fastify.post(
    '/insights',
    { preHandler: requireAdminRole('SUPER_ADMIN') },
    async (request, reply) => {
      // adminId MUST come from the verified JWT — never from client body
      const adminId = request.adminId;
      if (!adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin identity missing from token', 401);
      }

      const parseResult = cpInsightsBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { prompt, focus } = parseResult.data;

      // Trace ID: server-generated, never from client
      const requestId = `cp-insights-${Date.now()}-${randomUUID().slice(0, 8)}`;

      const result = await runControlPlaneInsight({
        prompt,
        focus,
        adminId,
        requestId,
        prisma,
      });

      return sendSuccess(reply, {
        insightText: result.text,
        requestId,
        meta: {
          model: 'gemini-1.5-flash',
          tokensUsed: result.tokensUsed,
          inferenceLatencyMs: result.inferenceLatencyMs,
          hadInferenceError: result.hadInferenceError,
          piiRedacted: result.piiRedacted,
          outputPiiDetected: result.outputPiiDetected,
          slice: 'G028-C1',
        },
      });
    }
  );
};

export default controlPlaneAiRoutes;
