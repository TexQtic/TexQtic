/**
 * control/ai.g028.ts — PW5-G028-C1/C2-CONTROL-PLANE-AI-INSIGHTS
 *
 * Control-plane AI routes — Slices 1 & 2.
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
 *   - targetOrgId (Slice 2) is UUID-valid via Zod + server-validated via DB lookup;
 *     it does NOT elevate auth or change the SUPER_ADMIN gate.
 *
 * Slice 1 guarantees (preserved):
 *   - No tenant AI route changes
 *   - No ai.control.* event-domain expansion
 *   - No schema / migration changes
 *   - No frontend wiring
 *   - Reasoning persisted in admin audit metadataJson, not reasoning_logs
 *
 * Slice 2 additions (PW5-G028-C2):
 *   - Optional targetOrgId in POST /insights body for per-org targeted mode
 *   - Server-side org existence check (prisma.tenant.findUnique)
 *   - Validated org metadata passed to service for prompt context injection
 *   - Requests without targetOrgId preserve Slice 1 behavior exactly
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
// Shared validators
// ---------------------------------------------------------------------------

/** UUID validator — used for targetOrgId to reject non-UUID strings at schema boundary. */
const uuidSchema = z.string().uuid('Must be a valid UUID');

// ---------------------------------------------------------------------------
// Request schema — Slice 1 + Slice 2
// ---------------------------------------------------------------------------

/**
 * POST /api/control/ai/insights request body.
 *
 * Slice 1 fields:
 *   - prompt  : The platform-level question or directive.
 *   - focus   : Optional context hint (e.g. 'platform-health', 'usage-trends').
 *
 * Slice 2 addition:
 *   - targetOrgId : Optional UUID of a specific org to target.
 *                   Server-validated via prisma.tenant.findUnique before use.
 *                   Not a trust-elevation signal — SUPER_ADMIN gate is unchanged.
 *                   When absent, request is treated as platform-global (Slice 1 behavior).
 *
 * Fields unconditionally rejected (all client identity signals):
 *   - orgId / tenantId / role / realm — not accepted in any slice
 */
const cpInsightsBodySchema = z.object({
  prompt: z.string().min(1).max(2_000),
  focus: z.string().max(200).optional(),
  targetOrgId: uuidSchema.optional(),
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

      const { prompt, focus, targetOrgId } = parseResult.data;

      // ── Slice 2: per-org target validation ─────────────────────────────────
      // targetOrgId is UUID-validated by Zod above but NOT yet verified to exist.
      // A server-side DB lookup is mandatory — this is not an auth-elevation path;
      // the SUPER_ADMIN gate above is the sole auth boundary. The lookup only
      // determines whether the org exists and retrieves bounded metadata for prompt
      // context injection. The sentinel admin DB context is unchanged.
      type TargetOrgMeta = { id: string; slug: string; name: string; type: string; status: string };
      let targetOrgMeta: TargetOrgMeta | undefined;

      if (targetOrgId) {
        const org = await prisma.tenant.findUnique({
          where: { id: targetOrgId },
          select: { id: true, slug: true, name: true, type: true, status: true },
        });
        if (!org) {
          return sendError(
            reply,
            'ORG_NOT_FOUND',
            `Target org '${targetOrgId}' does not exist`,
            404
          );
        }
        targetOrgMeta = {
          id: org.id,
          slug: org.slug,
          name: org.name,
          type: String(org.type),
          status: String(org.status),
        };
      }

      // Trace ID: server-generated, never from client
      const requestId = `cp-insights-${Date.now()}-${randomUUID().slice(0, 8)}`;

      const result = await runControlPlaneInsight({
        prompt,
        focus,
        adminId,
        requestId,
        prisma,
        targetOrgMeta,
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
          slice: targetOrgId ? 'G028-C2' : 'G028-C1',
          ...(targetOrgId && { targetOrgId }),
        },
      });
    }
  );
};

export default controlPlaneAiRoutes;
