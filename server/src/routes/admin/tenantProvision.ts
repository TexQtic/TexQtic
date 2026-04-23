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
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { adminAuthMiddleware, requireAdminRole } from '../../middleware/auth.js';
import { config } from '../../config/index.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { provisionTenant, queryProvisioningStatus } from '../../services/tenantProvision.service.js';
import { normalizeTenantProvisionRequest } from '../../types/tenantProvision.types.js';
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
const planSchema = z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'], {
  errorMap: () => ({ message: 'plan must be one of: FREE, STARTER, PROFESSIONAL, ENTERPRISE' }),
});

const tenantCategorySchema = z.enum(['AGGREGATOR', 'B2B', 'B2C', 'INTERNAL'], {
  errorMap: () => ({ message: 'tenant_category must be one of: AGGREGATOR, B2B, B2C, INTERNAL' }),
});

const baseFamilySchema = z.enum(['B2B', 'B2C', 'INTERNAL'], {
  errorMap: () => ({ message: 'base_family must be one of: B2B, B2C, INTERNAL' }),
});

const segmentKeySchema = z
  .string()
  .trim()
  .min(1, 'segment keys must be non-empty')
  .max(100, 'segment keys must be at most 100 characters');

const rolePositionKeySchema = z.enum(['manufacturer', 'trader', 'service_provider'], {
  errorMap: () => ({
    message: 'role_position_keys entries must be one of: manufacturer, trader, service_provider',
  }),
});

const provisionIdentitySchemaShape = {
  plan: planSchema.optional(),
  tenant_category: tenantCategorySchema.optional(),
  is_white_label: z.boolean().optional(),
  base_family: baseFamilySchema.optional(),
  aggregator_capability: z.boolean().optional(),
  white_label_capability: z.boolean().optional(),
  commercial_plan: planSchema.optional(),
  primary_segment_key: segmentKeySchema.optional(),
  secondary_segment_keys: z.array(segmentKeySchema).optional(),
  role_position_keys: z.array(rolePositionKeySchema).optional(),
};

const legacyProvisionBodySchema = z.object({
  provisioningMode: z.literal('LEGACY_ADMIN').optional(),
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
  ...provisionIdentitySchemaShape,
});

const approvedOnboardingProvisionBodySchema = z.object({
  provisioningMode: z.literal('APPROVED_ONBOARDING'),
  orchestrationReference: z.string().trim().min(1).max(255),
  ...provisionIdentitySchemaShape,
  organization: z.object({
    legalName: z.string().trim().min(2).max(500),
    displayName: z.string().trim().min(2).max(200).optional(),
    jurisdiction: z.string().trim().min(2).max(100),
    registrationNumber: z.string().trim().min(1).max(200).optional(),
  }),
  firstOwner: z.object({
    email: z.string().email('firstOwner.email must be a valid email address').toLowerCase(),
  }),
  approvedOnboardingMetadata: z.record(z.unknown()).optional(),
});

function parseProvisionRequestBody(body: unknown) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'provisioningMode' in body &&
    (body as { provisioningMode?: string }).provisioningMode === 'APPROVED_ONBOARDING'
  ) {
    return approvedOnboardingProvisionBodySchema.safeParse(body);
  }

  return legacyProvisionBodySchema.safeParse(body);
}

function validateProvisionRequestBody(body: unknown) {
  const parseResult = parseProvisionRequestBody(body);

  if (!parseResult.success) {
    return {
      success: false as const,
      errors: parseResult.error.errors,
    };
  }

  return normalizeTenantProvisionRequest(parseResult.data);
}

function hasConfiguredApprovedOnboardingServiceToken(): boolean {
  return Boolean(config.APPROVED_ONBOARDING_SERVICE_TOKEN_HASH);
}

function isApprovedOnboardingRequestBody(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'provisioningMode' in body &&
    (body as { provisioningMode?: string }).provisioningMode === 'APPROVED_ONBOARDING'
  );
}

function extractBearerToken(authorizationHeader: string | string[] | undefined): string | null {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    return null;
  }

  return token;
}

function tokenMatchesConfiguredHash(token: string, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(token).digest('hex');
  return timingSafeEqual(Buffer.from(actualHash, 'utf8'), Buffer.from(expectedHash, 'utf8'));
}

/**
 * Resolves the specific 409 conflict code from a Prisma P2002 error.
 * Uses meta.target to distinguish orchestration reference duplicates
 * from name/slug duplicates — enabling CRM-safe idempotent retry decisions.
 */
function resolveP2002ConflictCode(err: Error): { code: string; message: string } {
  const meta = (err as { meta?: { target?: string | string[] } }).meta;
  const target = meta?.target;
  const targetStr = Array.isArray(target)
    ? target.join(',')
    : typeof target === 'string'
    ? target
    : '';

  if (targetStr.toLowerCase().includes('orchestration')) {
    return {
      code: 'CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE',
      message: 'A tenant with this orchestration reference has already been provisioned',
    };
  }

  return {
    code: 'CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE',
    message: 'An organization with this name or slug already exists',
  };
}

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
  const requireSuperAdmin = requireAdminRole('SUPER_ADMIN');

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
  fastify.post('/tenants/provision', {
    preHandler: (request, reply, done) => {
      const bearerToken = extractBearerToken(request.headers.authorization);
      const approvedOnboardingServiceTokenHash = config.APPROVED_ONBOARDING_SERVICE_TOKEN_HASH;
      const hasServiceToken = Boolean(
        bearerToken &&
        approvedOnboardingServiceTokenHash &&
        hasConfiguredApprovedOnboardingServiceToken() &&
        tokenMatchesConfiguredHash(bearerToken, approvedOnboardingServiceTokenHash)
      );

      if (hasServiceToken) {
        if (!isApprovedOnboardingRequestBody(request.body)) {
          void Promise.resolve(sendError(
            reply,
            'FORBIDDEN',
            'Service credential is restricted to approved-onboarding provisioning',
            403
          )).then(() => done());
          return;
        }

        request.serviceCallerId = 'crm-approved-onboarding';
        request.serviceCallerType = 'APPROVED_ONBOARDING';
        done();
        return;
      }

      void Promise.resolve(adminAuthMiddleware(request, reply))
        .then(() => {
          if (reply.sent) {
            return;
          }

          return requireSuperAdmin(request, reply);
        })
        .then(() => done())
        .catch(done);
    },
  }, async (request, reply) => {
    const isServiceCaller = request.serviceCallerType === 'APPROVED_ONBOARDING';

    if (!isServiceCaller && (!request.isAdmin || !request.adminId)) {
      return sendError(
        reply,
        'FORBIDDEN',
        'Admin context required for tenant provisioning',
        403
      );
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const provisionRequest = validateProvisionRequestBody(request.body);

    if (!provisionRequest.success) {
      return sendValidationError(reply, provisionRequest.errors);
    }

    if (isServiceCaller && provisionRequest.data.provisioningMode !== 'APPROVED_ONBOARDING') {
      return sendError(
        reply,
        'FORBIDDEN',
        'Service credential is restricted to approved-onboarding provisioning',
        403
      );
    }

    const actorId = isServiceCaller
      ? (request.serviceCallerId ?? 'crm-approved-onboarding')
      : (request.adminId ?? 'unknown-admin');

    // ── Invoke provisioning service ───────────────────────────────────────────
    try {
      const result = await provisionTenant(
        provisionRequest.data,
        {
          requestId:    request.id ?? randomUUID(),
          adminActorId: actorId,
        }
      );

      // Audit log — Tier B: tenant provisioning had no prior audit trail (OPS-SUPERADMIN-ENFORCEMENT-001)
      await writeAuditLog(
        prisma,
        createAdminAudit(
          actorId,
          'control.tenants.provisioned',
          'tenant',
          {
            orgId: result.orgId,
            slug: result.slug,
            orgName: result.organization.legalName,
            provisioningMode: result.provisioningMode,
            orchestrationReference: result.orchestrationReference,
            inviteId: result.firstOwnerAccessPreparation?.inviteId ?? null,
            invitePurpose: result.firstOwnerAccessPreparation?.invitePurpose ?? null,
            authMode: isServiceCaller ? 'SERVICE_BEARER' : 'ADMIN_JWT',
            serviceCallerId: request.serviceCallerId ?? null,
            serviceCallerType: request.serviceCallerType ?? null,
          }
        )
      );

      // Return 201 Created with canonical org_id
      // NEVER echo password or internal DB internals
      return sendSuccess(
        reply,
        {
          provisioningMode: result.provisioningMode,
          orgId:        result.orgId,
          slug:         result.slug,
          userId:       result.userId,
          membershipId: result.membershipId,
          orchestrationReference: result.orchestrationReference,
          organization: result.organization,
          firstOwnerAccessPreparation: result.firstOwnerAccessPreparation,
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

      // Unique constraint: orchestration reference, slug, or name already exists
      if (
        err.message.includes('Unique constraint') ||
        ('code' in err && (err as { code: string }).code === 'P2002')
      ) {
        const { code, message } = resolveP2002ConflictCode(err);
        return sendError(reply, code, message, 409);
      }

      // Re-throw all other errors for Fastify's global error handler
      throw error;
    }
  });

  /**
   * GET /tenants/provision/status
   *
   * CRM-safe provisioning status polling endpoint.
   * Derives the activation-complete milestone from existing platform records —
   * no schema changes; pure read-only derived status.
   *
   * Authentication: service bearer token (APPROVED_ONBOARDING_SERVICE_TOKEN_HASH)
   *                 OR admin JWT + SUPER_ADMIN role.
   *
   * Query params (at least one required):
   *   orgId                  — Tenant UUID
   *   orchestrationReference — External orchestration reference
   *
   * Response (200):
   *   { success: true, data: ProvisioningStatusResponse }
   *
   * Errors:
   *   400 — missing required query parameters
   *   403 — unauthenticated or unauthorized
   *   404 — tenant not found for given identifiers
   */
  fastify.get('/tenants/provision/status', {
    preHandler: (request, reply, done) => {
      const bearerToken = extractBearerToken(request.headers.authorization);
      const approvedOnboardingServiceTokenHash = config.APPROVED_ONBOARDING_SERVICE_TOKEN_HASH;
      const hasServiceToken = Boolean(
        bearerToken &&
        approvedOnboardingServiceTokenHash &&
        hasConfiguredApprovedOnboardingServiceToken() &&
        tokenMatchesConfiguredHash(bearerToken, approvedOnboardingServiceTokenHash)
      );

      if (hasServiceToken) {
        request.serviceCallerId = 'crm-approved-onboarding';
        request.serviceCallerType = 'APPROVED_ONBOARDING';
        done();
        return;
      }

      void Promise.resolve(adminAuthMiddleware(request, reply))
        .then(() => {
          if (reply.sent) {
            return;
          }

          return requireSuperAdmin(request, reply);
        })
        .then(() => done())
        .catch(done);
    },
  }, async (request, reply) => {
    const isServiceCaller = request.serviceCallerType === 'APPROVED_ONBOARDING';

    if (!isServiceCaller && (!request.isAdmin || !request.adminId)) {
      return sendError(
        reply,
        'FORBIDDEN',
        'Admin context required for provisioning status queries',
        403
      );
    }

    const query = request.query as Record<string, string | undefined>;
    const orgId = query['orgId'];
    const orchestrationReference = query['orchestrationReference'];

    if (!orgId && !orchestrationReference) {
      return sendError(
        reply,
        'MISSING_PARAMETERS',
        'At least one of orgId or orchestrationReference is required',
        400
      );
    }

    const result = await queryProvisioningStatus({ orgId, orchestrationReference });

    if (!result) {
      return sendError(reply, 'NOT_FOUND', 'Tenant not found for the given identifiers', 404);
    }

    return sendSuccess(reply, result, 200);
  });
};

export default tenantProvisionRoutes;
