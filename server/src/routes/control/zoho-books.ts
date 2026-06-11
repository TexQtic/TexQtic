/**
 * Control-plane Zoho Books Monitoring Routes — Phase 1: Read-Only
 *
 * GET  /api/control/zoho-books/status              — integration config status tokens
 * GET  /api/control/zoho-books/contacts            — contact sync monitor (cross-tenant)
 * GET  /api/control/zoho-books/backfill-candidates — approved orgs with no Zoho contact row
 *
 * Auth: adminAuthMiddleware is inherited from the parent control plugin (control.ts addHook).
 * All endpoints additionally require SUPER_ADMIN role via local preHandler.
 *
 * Constitutional:
 *   - Never returns raw externalId, GSTIN, PAN, Aadhaar, OAuth tokens,
 *     metadataJson, DB URLs, cookies, raw Zoho responses, or env values.
 *   - externalId is surfaced only as "PRESENT" | "MISSING".
 *   - lastErrorSummary is sanitized before returning.
 *   - No mutations, no lifecycle triggers, no Zoho API calls.
 *
 * Phase 1 scope:
 *   ✅ Status token read (config posture, no raw env values)
 *   ✅ Contact sync monitor (read-only, paginated)
 *   ✅ Backfill candidates (read-only, count + safe fields)
 *   ❌ Retry actions — Phase 4
 *   ❌ Backfill execution — Phase 3
 *   ❌ Synthetic cleanup — Phase 5
 *   ❌ Accounting sync — Phase 7+
 *
 * Design unit: DESIGN-SUPERADMIN-ZOHO-BOOKS-OPERATIONS-SURFACE-01 (3b588e88)
 * Impl unit:   IMPL-SUPERADMIN-ZOHO-BOOKS-CONTACT-SYNC-MONITORING-READONLY-01
 */

import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  sendSuccess,
  sendError,
  sendForbidden,
  sendUnauthorized,
} from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import { readZohoBooksRuntimeConfig } from '../../services/zoho/zohoBooks.config.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';
const ZOHO_PROVIDER_KEY = 'zoho_books';
const ZOHO_CONTACT_OBJECT_TYPE = 'contact';
const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 25;

/**
 * Slug patterns that classify an org as SYNTHETIC (test residue).
 * Consistent with audit scripts already used in this codebase.
 */
const SYNTHETIC_SLUG_PATTERN = /synthetic|crm-verify|crm-await/i;

// ─── Local read context ───────────────────────────────────────────────────────

/**
 * Cross-tenant admin read context — mirrors withGstAdminReadContext in gst-verification.ts.
 * Sets app.is_admin = 'true' so _admin_all RLS policies grant cross-tenant reads.
 */
async function withZohoBooksAdminReadContext<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: ADMIN_SENTINEL_ID,
    actorId: ADMIN_SENTINEL_ID,
    realm: 'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Requires SUPER_ADMIN role. Mirrors requireSuperAdminReadAccess in control.ts.
 * Defined locally because the parent preHandler is not exported.
 */
const requireZohoBooksReadAccess: preHandlerHookHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  done,
) => {
  if (!request.isAdmin || !request.adminRole) {
    sendUnauthorized(reply, 'Admin authentication required');
    done();
    return;
  }
  if (request.adminRole !== 'SUPER_ADMIN') {
    sendForbidden(reply, 'Requires one of: SUPER_ADMIN');
    done();
    return;
  }
  done();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyOrgType(slug: string): 'SYNTHETIC' | 'REAL' {
  return SYNTHETIC_SLUG_PATTERN.test(slug) ? 'SYNTHETIC' : 'REAL';
}

/**
 * Sanitize lastErrorSummary before returning to client.
 * Strips potential DB URLs, token fragments, and connection strings.
 * Returns null if the input is null/undefined.
 */
function sanitizeErrorSummary(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Remove postgres:// and similar connection strings
  let sanitized = raw.replace(/\b(postgres|postgresql|mongodb|redis|mysql):\/\/[^\s]*/gi, '[REDACTED_URL]');
  // Remove anything that looks like a bearer token or API key (long alphanumeric strings with special chars)
  sanitized = sanitized.replace(/\b[A-Za-z0-9+/=]{40,}\b/g, '[REDACTED_TOKEN]');
  // Trim to safe length
  return sanitized.slice(0, 400);
}

// ─── Query schemas ────────────────────────────────────────────────────────────

const contactsQuerySchema = z.object({
  syncStatus: z
    .enum(['SYNC_SUCCESS', 'SYNC_FAILED', 'NOT_SYNCED'])
    .optional(),
  orgType: z.enum(['synthetic', 'real']).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlZohoBooksRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/zoho-books/status
   *
   * Returns integration config status tokens only.
   * No raw env values, no OAuth tokens, no Zoho credentials.
   *
   * SUPER_ADMIN only.
   */
  fastify.get('/status', { preHandler: requireZohoBooksReadAccess }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const configResult = readZohoBooksRuntimeConfig(process.env);

    const integrationEnabled = process.env['ZOHO_BOOKS_INTEGRATION_ENABLED'] === 'true'
      ? 'ENABLED'
      : 'DISABLED';
    const contactSyncEnabled = process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] === 'true'
      ? 'ENABLED'
      : 'DISABLED';
    const deprecatedFlagPresent = process.env['ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED'] === 'true';
    const deprecatedFlagWarning = deprecatedFlagPresent || ('deprecatedFlagUsed' in configResult && configResult.deprecatedFlagUsed === true);

    const missingKeys = configResult.status === 'MISSING_REQUIRED_ENV'
      ? configResult.missingKeys
      : [];

    let contactSyncPosture: 'LIVE' | 'OFF' | 'DEGRADED';
    if (configResult.status === 'READY' && contactSyncEnabled === 'ENABLED') {
      contactSyncPosture = 'LIVE';
    } else if (configResult.status === 'DISABLED') {
      contactSyncPosture = 'OFF';
    } else {
      contactSyncPosture = 'DEGRADED';
    }

    await writeAuditLog(
      prisma,
      createAdminAudit(request.adminId, 'control.zoho_books.status.read', 'organization_integration', {
        configReadiness: configResult.status,
        contactSyncPosture,
      }),
    );

    return sendSuccess(reply, {
      integrationEnabled,
      contactSyncEnabled,
      deprecatedFlagPresent,
      configReadiness: configResult.status,
      missingKeys,
      contactSyncPosture,
      deprecatedFlagWarning,
    });
  });

  /**
   * GET /api/control/zoho-books/contacts
   *
   * Cross-tenant list of organization_integrations rows for zoho_books/contact.
   * Cursor-based pagination, optional filters.
   *
   * SUPER_ADMIN only.
   *
   * Response does NOT include:
   *   - raw externalId (use externalIdStatus: PRESENT | MISSING)
   *   - metadataJson
   *   - GSTIN, PAN, Aadhaar
   *   - OAuth tokens, DB URLs, raw provider payloads
   */
  fastify.get('/contacts', { preHandler: requireZohoBooksReadAccess }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const queryResult = contactsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid query parameters', 400);
    }

    const {
      syncStatus: syncStatusFilter,
      orgType: orgTypeFilter,
      cursor,
      limit: rawLimit,
    } = queryResult.data;

    const limit = rawLimit ?? DEFAULT_PAGE_LIMIT;

    const rows = await withZohoBooksAdminReadContext(async tx => {
      // Build where clause for integration rows
      const where: {
        providerKey: string;
        externalObjectType: string;
        syncStatus?: string;
        id?: { gt: string };
      } = {
        providerKey: ZOHO_PROVIDER_KEY,
        externalObjectType: ZOHO_CONTACT_OBJECT_TYPE,
      };

      if (syncStatusFilter) {
        where.syncStatus = syncStatusFilter;
      }
      if (cursor) {
        where.id = { gt: cursor };
      }

      const integrations = await tx.organizationIntegration.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              slug: true,
              legal_name: true,
              status: true,
              plan: true,
            },
          },
        },
        orderBy: { id: 'asc' },
        take: limit + 1, // fetch one extra to determine hasMore
      });

      return integrations;
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;

    // Map to safe response shape + apply orgType filter after fetch
    const mappedRows = pageRows
      .map(row => {
        const orgType = classifyOrgType(row.organization.slug);
        return {
          id: row.id,
          organizationId: row.organizationId,
          organizationSlug: row.organization.slug,
          organizationStatus: row.organization.status,
          organizationPlan: row.organization.plan,
          organizationDisplayName: row.organization.legal_name,
          providerKey: row.providerKey,
          externalObjectType: row.externalObjectType,
          externalIdStatus: row.externalId !== null ? 'PRESENT' : 'MISSING',
          syncStatus: row.syncStatus,
          attemptCount: row.attemptCount,
          lastAttemptedAt: row.lastAttemptedAt?.toISOString() ?? null,
          lastDryRunAt: row.lastDryRunAt?.toISOString() ?? null,
          lastErrorSummary: sanitizeErrorSummary(row.lastErrorSummary),
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          orgType,
        };
      })
      .filter(row => {
        if (!orgTypeFilter) return true;
        if (orgTypeFilter === 'synthetic') return row.orgType === 'SYNTHETIC';
        if (orgTypeFilter === 'real') return row.orgType === 'REAL';
        return true;
      });

    // Summary counts (from the unfiltered full page for accuracy)
    const totalInPage = mappedRows.length;
    const synced = mappedRows.filter(r => r.syncStatus === 'SYNC_SUCCESS').length;
    const failed = mappedRows.filter(r => r.syncStatus === 'SYNC_FAILED').length;
    const pending = mappedRows.filter(r => r.syncStatus === 'NOT_SYNCED').length;
    const synthetic = mappedRows.filter(r => r.orgType === 'SYNTHETIC').length;
    const real = mappedRows.filter(r => r.orgType === 'REAL').length;

    await writeAuditLog(
      prisma,
      createAdminAudit(request.adminId, 'control.zoho_books.contacts.read', 'organization_integration', {
        count: totalInPage,
        syncStatusFilter: syncStatusFilter ?? null,
        orgTypeFilter: orgTypeFilter ?? null,
      }),
    );

    return sendSuccess(reply, {
      rows: mappedRows,
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
      summary: {
        total: totalInPage,
        synced,
        failed,
        pending,
        synthetic,
        real,
      },
    });
  });

  /**
   * GET /api/control/zoho-books/backfill-candidates
   *
   * Read-only list of organizations with status VERIFICATION_APPROVED
   * that do not have a Zoho Books contact integration row.
   *
   * SUPER_ADMIN only.
   * No backfill execution. No Zoho API calls. No mutations.
   *
   * Response includes:
   *   - count (total candidates)
   *   - rows (safe org fields only)
   *   - warning (real org backfill requires explicit Paresh authorization)
   */
  fastify.get('/backfill-candidates', { preHandler: requireZohoBooksReadAccess }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const candidates = await withZohoBooksAdminReadContext(async tx => {
      // Find approved orgs that have NO zoho_books/contact integration row
      const approvedOrgs = await tx.organizations.findMany({
        where: {
          status: 'VERIFICATION_APPROVED',
        },
        select: {
          id: true,
          slug: true,
          legal_name: true,
          status: true,
          plan: true,
          organizationIntegrations: {
            where: {
              providerKey: ZOHO_PROVIDER_KEY,
              externalObjectType: ZOHO_CONTACT_OBJECT_TYPE,
            },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { slug: 'asc' },
      });

      // Return only orgs where no integration row exists
      return approvedOrgs.filter(org => org.organizationIntegrations.length === 0);
    });

    const rows = candidates.map(org => {
      const orgType = classifyOrgType(org.slug);
      return {
        organizationId: org.id,
        organizationSlug: org.slug,
        organizationStatus: org.status,
        organizationPlan: org.plan,
        organizationDisplayName: org.legal_name,
        orgType,
      };
    });

    const realCandidates = rows.filter(r => r.orgType === 'REAL');
    const syntheticCandidates = rows.filter(r => r.orgType === 'SYNTHETIC');

    await writeAuditLog(
      prisma,
      createAdminAudit(request.adminId, 'control.zoho_books.backfill_candidates.read', 'organization_integration', {
        count: rows.length,
        realCount: realCandidates.length,
        syntheticCount: syntheticCandidates.length,
      }),
    );

    return sendSuccess(reply, {
      rows,
      count: rows.length,
      realCount: realCandidates.length,
      syntheticCount: syntheticCandidates.length,
      warning: 'Real org backfill requires explicit authorization from Paresh Patel and is not available in this phase. No backfill actions are available here.',
    });
  });
};

export default controlZohoBooksRoutes;
