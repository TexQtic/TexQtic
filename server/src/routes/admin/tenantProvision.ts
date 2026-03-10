/**
 * Admin Tenant Provisioning Route — G-008
 *
 * POST /api/control/tenants/provision
 *
 * Doctrine v1.4 Constitutional Tenancy
 * TECS v1.6 compliant
 *
 * Access: Admin-only (adminAuthMiddleware enforced at plugin level)
 *
 * CONSTITUTIONAL ENFORCEMENT:
 * - JWT admin realm verification (middleware)
 * - request.isAdmin guard (route-level, fail-fast before service call)
 * - DB-level admin context assertion (service-level stop-loss)
 * - org_id returned as canonical tenant boundary (never tenant_id exposed)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { adminAuthMiddleware, requireAdminRole } from '../../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { provisionTenant } from '../../services/tenantProvision.service.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';

/**
 * Request body schema — validated before service invocation.
 *
 * Security constraints:
 * - orgName: 2–200 chars, trimmed
 * - primaryAdminEmail: valid email format
 * - primaryAdminPassword: minimum 8 chars (bcrypt hashing in service)
 */
const provisionBodySchema = z.object({
  orgName: z
    .string()
    .min(2, 'orgName must be at least 2 characters')
    .max(200, 'orgName must be at most 200 characters')
    .trim(),
  primaryAdminEmail: z
    .string()
    .email('primaryAdminEmail must be a valid email address')
    .toLowerCase(),
  primaryAdminPassword: z
    .string()
    .min(8, 'primaryAdminPassword must be at least 8 characters'),
  tenant_category: z.enum(['AGGREGATOR', 'B2B', 'B2C', 'INTERNAL'], {
    errorMap: () => ({ message: 'tenant_category must be one of: AGGREGATOR, B2B, B2C, INTERNAL' }),
  }),
  is_white_label: z.boolean().optional().default(false),
});

/**
 * tenantProvisionRoutes — Fastify plugin for admin tenant provisioning
 *
 * Registered at prefix /api/control (see server/src/index.ts)
 * Full route: POST /api/control/tenants/provision
 *
 * Authentication gate: adminAuthMiddleware (JWT admin realm, mandatory)
 * Authorization gate: request.isAdmin check (defense-in-depth)
 */
const tenantProvisionRoutes: FastifyPluginAsync = async fastify => {
  // All routes in this plugin require admin authentication
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * POST /tenants/provision
   *
   * Provisions a new tenant (org) under Doctrine v1.4 constitutional rules:
   * - Single atomic transaction
   * - Admin context entered (tx-local, pooler-safe)
   * - Tenant created under admin context
   * - Tenant context set for membership + user creation
   * - Context auto-clears on tx commit
   *
   * Request body:
   *   { orgName, primaryAdminEmail, primaryAdminPassword }
   *
   * Response (201):
   *   { success: true, data: { orgId, slug, userId, membershipId } }
   *
   * Errors:
   *   400 — validation failure
   *   403 — non-admin caller
   *   409 — slug or user constraint conflict
   *   500 — internal / DB error
   */
  fastify.post('/tenants/provision', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    // ── Route-level admin enforcement (defense-in-depth) ──────────────────────
    // adminAuthMiddleware guards the plugin, but we assert isAdmin explicitly
    // before touching any service logic (fail-closed posture).
    if (!request.isAdmin || !request.adminId) {
      return sendError(
        reply,
        'FORBIDDEN',
        'Admin context required for tenant provisioning',
        403
      );
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const parseResult = provisionBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { orgName, primaryAdminEmail, primaryAdminPassword, tenant_category, is_white_label } = parseResult.data;

    // ── Invoke provisioning service ───────────────────────────────────────────
    try {
      const result = await provisionTenant(
        { orgName, primaryAdminEmail, primaryAdminPassword, tenant_category, is_white_label },
        {
          requestId:    request.id ?? randomUUID(),
          adminActorId: request.adminId,
        }
      );

      // Audit log — Tier B: tenant provisioning had no prior audit trail (OPS-SUPERADMIN-ENFORCEMENT-001)
      await writeAuditLog(
        prisma,
        createAdminAudit(
          request.adminId,
          'control.tenants.provisioned',
          'tenant',
          {
            orgId:   result.orgId,
            slug:    result.slug,
            orgName,
          }
        )
      );

      // Return 201 Created with canonical org_id
      // NEVER echo password or internal DB internals
      return sendSuccess(
        reply,
        {
          orgId:        result.orgId,
          slug:         result.slug,
          userId:       result.userId,
          membershipId: result.membershipId,
        },
        201
      );
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Stop-loss abort (propagated from service)
      if (err.message.startsWith('PROVISION_ABORT:')) {
        request.log.error({ err: err.message }, 'G-008 stop-loss triggered — admin context assertion failed');
        return sendError(reply, 'PROVISION_ABORT', 'Admin context assertion failed', 500);
      }

      // Unique constraint: slug or user+tenant membership already exists
      if (
        err.message.includes('Unique constraint') ||
        ('code' in err && (err as { code: string }).code === 'P2002')
      ) {
        return sendError(
          reply,
          'CONFLICT',
          'An organization with this name (slug) already exists, or the user already holds a membership in this tenant',
          409
        );
      }

      // Re-throw all other errors for Fastify's global error handler
      throw error;
    }
  });
};

export default tenantProvisionRoutes;
