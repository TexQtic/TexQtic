import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { StateMachineService } from '../services/stateMachine.service.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import tenantEscalationRoutes from './tenant/escalation.g022.js';
import tenantTradesRoutes from './tenant/trades.g017.js';
import tenantEscrowRoutes from './tenant/escrow.g018.js';
import tenantSettlementRoutes from './tenant/settlement.js';
import tenantCertificationRoutes from './tenant/certifications.g019.js';
import tenantTraceabilityRoutes from './tenant/traceability.g016.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
} from '../utils/response.js';
import {
  withDbContext,
  type DatabaseContext,
  getOrganizationIdentity,
  OrganizationNotFoundError,
} from '../lib/database-context.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { computeTotals, TotalsInputError } from '../services/pricing/totals.service.js';
import { sendInviteMemberEmail } from '../services/email/email.service.js';
import bcrypt from 'bcryptjs';
import { emitCacheInvalidate } from '../lib/cacheInvalidateEmitter.js';
import { enqueueSourceIngestion, enqueueSourceDeletion } from '../services/vectorIngestion.js';

// ─── SM Transaction Helper ────────────────────────────────────────────────────
/**
 * Wraps a Prisma TransactionClient as PrismaClient for services that require
 * the full client type. Redirects $transaction() to execute the callback
 * immediately in the current tx (Prisma does not support nested transactions).
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

const tenantRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/me
   * Get current authenticated user (tenant realm)
   */
  fastify.get('/me', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { userId, tenantId, userRole } = request;

    // Guard: tenantId must be present (set by tenantAuthMiddleware from JWT).
    // Missing tenantId means the token is malformed or for wrong realm.
    if (!tenantId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant context missing from token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // G-015 Phase C: read org identity via admin-context (organizations table, RESTRICTIVE guard).
    // Cannot read organizations in tenant-realm without admin elevation.
    // Preserve response shape: legal_name → name, org_type → type.
    // MUST return a non-null tenant object — returning null causes the frontend
    // workspace spinner to hang indefinitely (tenants[] stays empty).
    let tenant: { id: string; slug: string; name: string; type: string; tenant_category: string; is_white_label: boolean; status: string; plan: string };
    try {
      const org = await getOrganizationIdentity(tenantId, prisma);
      tenant = {
        id: org.id,
        slug: org.slug,
        name: org.legal_name,
        type: org.org_type,
        // B2-REM-2: canonical identity fields
        tenant_category: org.org_type,
        is_white_label: org.is_white_label,
        status: org.status,
        plan: org.plan,
      };
    } catch (err) {
      if (err instanceof OrganizationNotFoundError) {
        // Org row not yet provisioned. Return explicit 404 so the UI can show
        // a "provisioning in progress" state rather than spinning indefinitely.
        return sendError(reply, 'NOT_FOUND', 'Organisation not yet provisioned for this tenant', 404);
      }
      throw err;
    }

    return sendSuccess(reply, {
      user,
      tenant,
      role: userRole,
    });
  });

  /**
   * GET /api/tenant/audit-logs
   * Get audit logs for current tenant only (Gate D.3: RLS-enforced)
   * Manual tenant filter removed; RLS policies handle tenant boundary
   */
  fastify.get('/tenant/audit-logs', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const logs = await withDbContext(prisma, dbContext, async tx => {
      return await tx.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/tenant/memberships
   * Get memberships for current tenant (Gate D.1: RLS-enforced)
   * Authorization: OWNER, ADMIN, MEMBER only. VIEWER is explicitly denied.
   * Tenant boundary additionally enforced by RLS via app.org_id.
   * Manual tenant filter removed; RLS policies handle tenant boundary.
   */
  fastify.get(
    '/tenant/memberships',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userRole } = request;

      // Enforce read-role policy: OWNER, ADMIN, MEMBER allowed; VIEWER denied.
      if (userRole !== 'OWNER' && userRole !== 'ADMIN' && userRole !== 'MEMBER') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const memberships = await withDbContext(prisma, dbContext, async tx => {
        return await tx.membership.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                emailVerified: true,
              },
            },
          },
        });
      });

      return sendSuccess(reply, { memberships, count: memberships.length });
    }
  );

  /**
   * PATCH /api/tenant/memberships/:id
   * Update the role of an existing tenant membership (TECS-FBW-012)
   *
   * Actor rule:   Only OWNER may perform role changes.
   * Target rule:  Same-org membership only (RLS + explicit tenantId filter).
   *               Invite records are not handled here.
   *
   * Allowed transitions:
   *   MEMBER  → ADMIN | OWNER
   *   ADMIN   → MEMBER | OWNER
   *   OWNER   → ADMIN | MEMBER  (self only, OWNER invariant enforced)
   *
   * Disallowed:
   *   any  → VIEWER              (VIEWER_TRANSITION_OUT_OF_SCOPE)
   *   VIEWER → any               (VIEWER_TRANSITION_OUT_OF_SCOPE)
   *   same  → same               (NO_OP_ROLE_CHANGE)
   *   OWNER → ADMIN/MEMBER for a different OWNER  (PEER_OWNER_DEMOTION_FORBIDDEN)
   *   sole OWNER self-downgrade  (SOLE_OWNER_CANNOT_DOWNGRADE)
   *
   * OWNER invariant: at least one OWNER must remain in the org after any mutation.
   * Audit:  Every successful change writes membership.role.updated (realm TENANT).
   */
  fastify.patch(
    '/tenant/memberships/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Actor guard: only OWNER may perform membership role changes
      if (userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER can update membership roles', 403);
      }

      // Validate path param
      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }
      const { id: membershipId } = paramsResult.data;

      // Validate body — accept full MembershipRole enum so VIEWER gets a specific error code
      const bodySchema = z.object({
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
      });
      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const { role: requestedRole } = bodyResult.data;

      // Explicitly reject VIEWER as a target (product decision: VIEWER transitions out of scope)
      if (requestedRole === 'VIEWER') {
        return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
      }

      // At this point requestedRole is 'OWNER' | 'ADMIN' | 'MEMBER'
      const safeRole = requestedRole as 'OWNER' | 'ADMIN' | 'MEMBER';

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Load target membership — org-scoped (RLS enforces boundary; explicit tenantId is defense-in-depth)
        const target = await tx.membership.findFirst({
          where: { id: membershipId, tenantId: dbContext.orgId },
          select: { id: true, userId: true, role: true },
        });

        if (!target) {
          return { error: 'MEMBERSHIP_NOT_FOUND' as const };
        }

        const fromRole = target.role;

        // Reject VIEWER as a source role (VIEWER → any is out of scope)
        if (fromRole === 'VIEWER') {
          return { error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' as const };
        }

        // Reject no-op: same-role transitions carry no semantic meaning
        if ((fromRole as string) === safeRole) {
          return { error: 'NO_OP_ROLE_CHANGE' as const };
        }

        const isSelfTarget = target.userId === userId;

        // Peer-OWNER demotion is unconditionally forbidden (product decision)
        // An OWNER targeting another OWNER's record for downgrade is not permitted.
        if (fromRole === 'OWNER' && !isSelfTarget) {
          return { error: 'PEER_OWNER_DEMOTION_FORBIDDEN' as const };
        }

        // OWNER invariant: for self-downgrade, at least one other OWNER must remain.
        if (fromRole === 'OWNER' && isSelfTarget) {
          const ownerCount = await tx.membership.count({
            where: { tenantId: dbContext.orgId, role: 'OWNER' },
          });
          if (ownerCount <= 1) {
            return { error: 'SOLE_OWNER_CANNOT_DOWNGRADE' as const };
          }
        }

        // Apply the role update
        const updated = await tx.membership.update({
          where: { id: membershipId },
          data: { role: safeRole },
          select: { id: true, userId: true, tenantId: true, role: true, updatedAt: true },
        });

        // Audit log — written atomically within the same transaction
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'membership.role.updated',
          entity: 'membership',
          entityId: membershipId,
          metadataJson: {
            targetMembershipId: membershipId,
            targetUserId: target.userId,
            fromRole,
            toRole: safeRole,
          },
        });

        return { membership: updated };
      });

      if ('error' in result) {
        if (result.error === 'MEMBERSHIP_NOT_FOUND') {
          return sendNotFound(reply, 'Membership not found');
        }
        if (result.error === 'VIEWER_TRANSITION_OUT_OF_SCOPE') {
          return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
        }
        if (result.error === 'NO_OP_ROLE_CHANGE') {
          return sendError(reply, 'NO_OP_ROLE_CHANGE', 'Membership already has the requested role', 409);
        }
        if (result.error === 'PEER_OWNER_DEMOTION_FORBIDDEN') {
          return sendError(reply, 'PEER_OWNER_DEMOTION_FORBIDDEN', 'Cannot change the role of another OWNER', 403);
        }
        if (result.error === 'SOLE_OWNER_CANNOT_DOWNGRADE') {
          return sendError(reply, 'SOLE_OWNER_CANNOT_DOWNGRADE', 'Cannot downgrade the sole OWNER of this organisation', 409);
        }
      }

      return sendSuccess(reply, { membership: result.membership });
    }
  );

  /**
   * GET /api/tenant/catalog/items
   * Read tenant-visible catalog items with cursor pagination
   *
   * Gate B.2: RLS-enforced tenant isolation via app.org_id context
   * Manual tenant filters removed; RLS policies handle tenant boundary
   */
  fastify.get(
    '/tenant/catalog/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      // Fail-closed: require database context (from databaseContextMiddleware)
      if (!request.dbContext) {
        return sendUnauthorized(reply, 'Missing database context');
      }

      // Validate query params
      const querySchema = z.object({
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
      });

      const parseResult = querySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { q, limit, cursor } = parseResult.data;

      // Gate B.2: RLS-enforced query (no manual tenantId filter)
      // Tenant isolation enforced by: catalog_items tenant_id = app.current_org_id()
      const items = await withDbContext(prisma, request.dbContext, async tx => {
        return await tx.catalogItem.findMany({
          where: {
            // Manual tenant filter REMOVED (RLS enforces tenant boundary)
            active: true,
            ...(q && {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }),
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
        });
      });

      const hasMore = items.length > limit;
      const resultItems = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.id : null;

      return sendSuccess(reply, {
        items: resultItems,
        count: resultItems.length,
        nextCursor,
      });
    }
  );

  /**
   * POST /api/tenant/catalog/items
   * Create a catalog item (OWNER or ADMIN only)
   *
   * RU-003: Revenue-unblock — catalog item creation
   * Writes audit entry: catalog.item.created
   */
  fastify.post(
    '/tenant/catalog/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may create catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can create catalog items', 403);
      }

      const bodySchema = z.object({
        name: z.string().min(1).max(255),
        sku: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        price: z.number().positive(),
        moq: z.number().int().min(1).default(1),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { name, sku, description, price, moq } = parseResult.data;

      const item = await withDbContext(prisma, dbContext, async tx => {
        const created = await tx.catalogItem.create({
          data: {
            tenantId: dbContext.orgId,
            name,
            sku: sku ?? null,
            description: description ?? null,
            price,
            moq,
            active: true,
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.created',
          entity: 'catalog_item',
          entityId: created.id,
          metadataJson: { name, sku: sku ?? null, price, moq },
        });

        return created;
      });

      // G-028 B1: Enqueue async vector indexing after successful DB commit.
      // Must run after withDbContext resolves so the transaction is committed.
      // Failure is best-effort: a full queue does not fail the HTTP response.
      const vectorText = description ? `${name}\n\n${description}` : name;
      const enqueueResult = enqueueSourceIngestion(
        dbContext.orgId,
        'CATALOG_ITEM',
        item.id,
        vectorText,
        { name },
      );
      if (!enqueueResult.accepted) {
        console.warn('[G028-B1][catalog_item_enqueue_rejected]', {
          stage:      'vector_async_index',
          sourceType: 'CATALOG_ITEM',
          sourceId:   item.id,
          reason:     enqueueResult.reason,
        });
      }

      return sendSuccess(reply, { item }, 201);
    }
  );

  /**
   * PATCH /api/tenant/catalog/items/:id
   * Update an existing catalog item (OWNER or ADMIN only)
   *
   * G-028 B2: Post-commit vector reindex enqueue (best-effort, outside tx).
   * Writes audit entry: catalog.item.updated
   */
  fastify.patch(
    '/tenant/catalog/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may update catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can update catalog items', 403);
      }

      const { id } = request.params as { id: string };

      const bodySchema = z.object({
        name: z.string().min(1).max(255).optional(),
        sku: z.string().min(1).max(100).nullable().optional(),
        description: z.string().nullable().optional(),
        price: z.number().positive().optional(),
        moq: z.number().int().min(1).optional(),
        active: z.boolean().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      if (Object.keys(parseResult.data).length === 0) {
        return sendError(reply, 'VALIDATION_ERROR', 'At least one field must be provided for update', 400);
      }

      const data = parseResult.data;

      const updated = await withDbContext(prisma, dbContext, async tx => {
        // Org-scoped lookup: confirms item belongs to this tenant before update.
        // Defense in depth — RLS also enforces boundary, but explicit filter is required.
        const existing = await tx.catalogItem.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true },
        });
        if (!existing) {
          return null;
        }

        const result = await tx.catalogItem.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.sku !== undefined ? { sku: data.sku } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.price !== undefined ? { price: data.price } : {}),
            ...(data.moq !== undefined ? { moq: data.moq } : {}),
            ...(data.active !== undefined ? { active: data.active } : {}),
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.updated',
          entity: 'catalog_item',
          entityId: result.id,
          metadataJson: { ...data },
        });

        return result;
      });

      if (!updated) {
        return sendNotFound(reply, 'Catalog item not found');
      }

      // G-028 B2: Enqueue async vector reindex after successful DB commit.
      // Must run after withDbContext resolves so the transaction is committed.
      // Failure is best-effort: a full queue does not fail the HTTP response.
      const vectorText = updated.description ? `${updated.name}\n\n${updated.description}` : updated.name;
      const enqueueResult = enqueueSourceIngestion(
        dbContext.orgId,
        'CATALOG_ITEM',
        updated.id,
        vectorText,
        { name: updated.name },
      );
      if (!enqueueResult.accepted) {
        console.warn('[G028-B2][catalog_item_update_enqueue_rejected]', {
          stage:      'vector_async_reindex',
          sourceType: 'CATALOG_ITEM',
          sourceId:   updated.id,
          reason:     enqueueResult.reason,
        });
      }

      return sendSuccess(reply, { item: updated });
    }
  );

  /**
   * DELETE /api/tenant/catalog/items/:id
   * Delete a catalog item (OWNER or ADMIN only)
   *
   * G-028-B2-DELETE-ENQUEUE-BLOCKER: post-commit best-effort enqueue via
   * enqueueSourceDeletion() removes stale vector chunks for the deleted item.
   * Enqueue failure is non-blocking — audit write and HTTP 200 are unaffected.
   * Writes audit entry: catalog.item.deleted
   */
  fastify.delete(
    '/tenant/catalog/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may delete catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can delete catalog items', 403);
      }

      const { id } = request.params as { id: string };

      const deleted = await withDbContext(prisma, dbContext, async tx => {
        // Org-scoped lookup: confirms item belongs to this tenant before delete.
        // Defense in depth — RLS also enforces boundary, but explicit filter is required.
        const existing = await tx.catalogItem.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true, name: true },
        });
        if (!existing) {
          return null;
        }

        await tx.catalogItem.delete({
          where: { id },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.deleted',
          entity: 'catalog_item',
          entityId: id,
          metadataJson: { name: existing.name },
        });

        return existing;
      });

      if (!deleted) {
        return sendNotFound(reply, 'Catalog item not found');
      }

      // G-028-B2-DELETE-ENQUEUE-BLOCKER: Enqueue async vector chunk deletion post-commit.
      // Runs after withDbContext() resolves (transaction committed). Failure is best-effort:
      // a full queue does not affect the HTTP 200 response or audit correctness.
      const deleteEnqueueResult = enqueueSourceDeletion(
        dbContext.orgId,
        'CATALOG_ITEM',
        id,
      );
      if (!deleteEnqueueResult.accepted) {
        console.warn('[G028-DELETE][catalog_item_delete_enqueue_rejected]', {
          stage:      'vector_async_delete',
          sourceType: 'CATALOG_ITEM',
          sourceId:   id,
          reason:     deleteEnqueueResult.reason,
        });
      }

      return sendSuccess(reply, { id, deleted: true });
    }
  );

  /**
   * POST /api/tenant/cart
   * Create or return active cart for authenticated tenant user (idempotent)
   * Gate D.2: RLS-enforced, manual tenant filters removed
   */
  fastify.post('/tenant/cart', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;

    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const result = await withDbContext(prisma, dbContext, async tx => {
      // Find existing active cart (RLS enforces tenant boundary)
      let cart = await tx.cart.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          },
        },
      });

      // Create if not exists
      if (!cart) {
        cart = await tx.cart.create({
          data: {
            tenantId: dbContext.orgId,
            userId: userId,
            status: 'ACTIVE',
          },
          include: {
            items: {
              include: {
                catalogItem: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                    active: true,
                  },
                },
              },
            },
          },
        });

        // Audit: cart created
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'cart.CART_CREATED',
          entity: 'cart',
          entityId: cart.id,
          metadataJson: {
            cartId: cart.id,
            tenantId: dbContext.orgId,
            userId,
          },
        });
      }

      return cart;
    });

    return sendSuccess(reply, { cart: result }, 201);
  });

  /**
   * GET /api/tenant/cart
   * Get active cart with items for current tenant user
   * Gate D.2: RLS-enforced, manual tenant filter removed
   */
  fastify.get('/tenant/cart', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;

    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const cart = await withDbContext(prisma, dbContext, async tx => {
      return await tx.cart.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          },
        },
      });
    });

    if (!cart) {
      return sendSuccess(reply, { cart: null });
    }

    return sendSuccess(reply, { cart });
  });

  /**
   * POST /api/tenant/cart/items
   * Add item to cart or increment quantity if already present
   * Gate D.2: RLS-enforced, manual tenant validation removed
   */
  fastify.post(
    '/tenant/cart/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId } = request;

      // Validate body
      const bodySchema = z.object({
        catalogItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { catalogItemId, quantity } = parseResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Validate catalog item exists and is active (RLS enforces tenant boundary)
        const catalogItem = await tx.catalogItem.findUnique({
          where: { id: catalogItemId },
        });

        if (!catalogItem) {
          return { error: 'CATALOG_ITEM_NOT_FOUND' };
        }

        // RLS removed: catalogItem.tenantId check (RLS policies enforce tenant boundary)

        if (!catalogItem.active) {
          return { error: 'CATALOG_ITEM_INACTIVE' };
        }

        // Ensure active cart exists (create if missing, RLS enforces tenant boundary)
        let cart = await tx.cart.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        if (!cart) {
          cart = await tx.cart.create({
            data: {
              tenantId: dbContext.orgId,
              userId: userId,
              status: 'ACTIVE',
            },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'cart.CART_CREATED',
            entity: 'cart',
            entityId: cart.id,
            metadataJson: { cartId: cart.id, tenantId: dbContext.orgId, userId },
          });
        }

        // Upsert cart item
        const existingCartItem = await tx.cartItem.findUnique({
          where: {
            cartId_catalogItemId: {
              cartId: cart.id,
              catalogItemId,
            },
          },
        });

        // MOQ enforcement: finalQty = existing + incoming must meet moq
        const currentQty = existingCartItem?.quantity ?? 0;
        const finalQty = currentQty + quantity;
        if (finalQty < catalogItem.moq) {
          return {
            error: 'MOQ_NOT_MET' as const,
            requiredMoq: catalogItem.moq,
            finalQty,
          };
        }

        let cartItem;
        let resultingQuantity;

        if (existingCartItem) {
          resultingQuantity = existingCartItem.quantity + quantity;
          cartItem = await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: resultingQuantity },
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          });
        } else {
          resultingQuantity = quantity;
          cartItem = await tx.cartItem.create({
            data: {
              cartId: cart.id,
              catalogItemId,
              quantity,
            },
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          });
        }

        // Audit: item added
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'cart.CART_ITEM_ADDED',
          entity: 'cart_item',
          entityId: cartItem.id,
          metadataJson: {
            cartId: cart.id,
            catalogItemId,
            quantityAdded: quantity,
            resultingQuantity,
          },
        });

        return { cartItem };
      });

      if ('error' in result) {
        if (result.error === 'CATALOG_ITEM_NOT_FOUND') {
          return sendNotFound(reply, 'Catalog item not found');
        }
        // RLS removed: FORBIDDEN error (RLS policies enforce tenant boundary at DB level)
        if (result.error === 'CATALOG_ITEM_INACTIVE') {
          return sendError(reply, 'BAD_REQUEST', 'Catalog item is not active', 400);
        }
        if (result.error === 'MOQ_NOT_MET') {
          return reply.status(422).send({
            success: false,
            error: {
              code: 'MOQ_NOT_MET',
              message: 'Quantity below minimum order quantity',
              requiredMoq: result.requiredMoq,
              finalQty: result.finalQty,
            },
          });
        }
      }

      return sendSuccess(reply, { cartItem: result.cartItem }, 201);
    }
  );

  /**
   * POST /api/tenant/rfq
   * Record a non-binding buyer-initiated RFQ submission for a tenant-scoped catalog item.
   * This route is the backend prerequisite for future Request Quote CTA activation only.
   */
  fastify.post('/tenant/rfq', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;

    const bodySchema = z.object({
      catalogItemId: z.string().uuid(),
      quantity: z.number().int().min(1).optional().default(1),
      buyerMessage: z.string().trim().min(1).max(1000).optional(),
    }).strict();

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { catalogItemId, quantity, buyerMessage } = parseResult.data;

    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const requestId = randomUUID();
    const submittedAt = new Date().toISOString();

    const result = await withDbContext(prisma, dbContext, async tx => {
      const catalogItem = await tx.catalogItem.findUnique({
        where: { id: catalogItemId },
        select: {
          id: true,
          name: true,
          sku: true,
          active: true,
        },
      });

      if (!catalogItem) {
        return { error: 'CATALOG_ITEM_NOT_FOUND' as const };
      }

      if (!catalogItem.active) {
        return { error: 'CATALOG_ITEM_INACTIVE' as const };
      }

      await writeAuditLog(tx, {
        realm: 'TENANT',
        tenantId: dbContext.orgId,
        actorType: 'USER',
        actorId: userId ?? null,
        action: 'rfq.RFQ_INITIATED',
        entity: 'rfq',
        entityId: requestId,
        afterJson: {
          requestId,
          catalogItemId: catalogItem.id,
          catalogItemName: catalogItem.name,
          catalogItemSku: catalogItem.sku,
          quantity,
          buyerMessage: buyerMessage ?? null,
          status: 'INITIATED',
          nonBinding: true,
          submittedAt,
        },
        metadataJson: {
          requestId,
          catalogItemId: catalogItem.id,
          quantity,
          submittedAt,
          initiatedBy: 'BUYER',
          nonBinding: true,
        },
      });

      return {
        requestId,
        catalogItemId: catalogItem.id,
        quantity,
        submittedAt,
      };
    });

    if ('error' in result) {
      if (result.error === 'CATALOG_ITEM_NOT_FOUND') {
        return sendNotFound(reply, 'Catalog item not found');
      }

      if (result.error === 'CATALOG_ITEM_INACTIVE') {
        return sendError(reply, 'BAD_REQUEST', 'Catalog item is not active', 400);
      }
    }

    return sendSuccess(reply, {
      requestId: result.requestId,
      status: 'RFQ_INITIATED',
      nonBinding: true,
      catalogItemId: result.catalogItemId,
      quantity: result.quantity,
      submittedAt: result.submittedAt,
    }, 201);
  });

  /**
   * PATCH /api/tenant/cart/items/:id
   * Update cart item quantity or remove if quantity is 0
   * Gate D.2: RLS-enforced, manual tenant/cart ownership checks removed
   */
  fastify.patch(
    '/tenant/cart/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId } = request;

      // Validate params
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const { id: cartItemId } = paramsResult.data;

      // Validate body
      const bodySchema = z.object({
        quantity: z.number().int().min(0),
      });

      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { quantity } = bodyResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Find cart item (RLS enforces tenant boundary via cart FK)
        const cartItem = await tx.cartItem.findUnique({
          where: { id: cartItemId },
          include: {
            cart: true,
            catalogItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                active: true,
              },
            },
          },
        });

        if (!cartItem) {
          return { error: 'CART_ITEM_NOT_FOUND' };
        }

        // Verify user ownership and cart status (user-level check, not tenant-level)
        // RLS removed: cartItem.cart.tenantId check (RLS policies enforce tenant boundary)
        if (cartItem.cart.userId !== userId || cartItem.cart.status !== 'ACTIVE') {
          return { error: 'FORBIDDEN' };
        }

        // If quantity is 0, remove the item
        if (quantity === 0) {
          await tx.cartItem.delete({
            where: { id: cartItemId },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'cart.CART_ITEM_REMOVED',
            entity: 'cart_item',
            entityId: cartItemId,
            metadataJson: {
              cartId: cartItem.cartId,
              catalogItemId: cartItem.catalogItemId,
              previousQuantity: cartItem.quantity,
            },
          });

          return { removed: true };
        }

        // Otherwise update quantity
        const updatedCartItem = await tx.cartItem.update({
          where: { id: cartItemId },
          data: { quantity },
          include: {
            catalogItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                active: true,
              },
            },
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'cart.CART_ITEM_UPDATED',
          entity: 'cart_item',
          entityId: cartItemId,
          metadataJson: {
            cartId: cartItem.cartId,
            catalogItemId: cartItem.catalogItemId,
            previousQuantity: cartItem.quantity,
            newQuantity: quantity,
          },
        });

        return { cartItem: updatedCartItem };
      });

      if ('error' in result) {
        if (result.error === 'CART_ITEM_NOT_FOUND') {
          return sendNotFound(reply, 'Cart item not found');
        }
        if (result.error === 'FORBIDDEN') {
          return sendError(
            reply,
            'FORBIDDEN',
            'Cart item does not belong to your active cart',
            403
          );
        }
      }

      if ('removed' in result) {
        return sendSuccess(reply, { removed: true });
      }

      return sendSuccess(reply, { cartItem: result.cartItem });
    }
  );

  // ---------------------------------------------------------------------------
  // PR-A: Orders + Checkout
  // ---------------------------------------------------------------------------

  /**
   * POST /api/tenant/checkout
   * Convert active cart → order (stub payment, PAYMENT_PENDING status)
   * Gate PR-A: RLS-enforced via withDbContext
   */
  fastify.post('/tenant/checkout', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }
    const t0 = Date.now();

    const result = await withDbContext(prisma, dbContext, async tx => {
      // Load active cart with items + catalog metadata
      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          items: {
            include: {
              catalogItem: {
                select: { id: true, name: true, sku: true, price: true },
              },
            },
          },
        },
      });

      if (!cart) return { error: 'CART_NOT_FOUND' };
      if (cart.items.length === 0) return { error: 'CART_EMPTY' };

      // Compute totals via canonical Phase-1 function (G-010)
      // Stop-loss: TotalsInputError thrown if unitPrice/quantity invalid (never silent)
      const cartItems = cart.items;
      let totals;
      try {
        totals = computeTotals(
          cartItems.map((item: typeof cartItems[number]) => ({
            unitPrice: Number(item.catalogItem.price),
            quantity: item.quantity,
          })),
          'USD'
        );
      } catch (err) {
        if (err instanceof TotalsInputError) {
          return { error: 'INVALID_LINE_ITEM', code: err.code, message: err.message };
        }
        throw err;
      }
      const { subtotal, grandTotal: total, discountTotal, taxTotal, feeTotal, breakdown } = totals;

      // Create order + items + mark cart checked-out in single transaction
      const order = await tx.order.create({
        data: {
          tenantId: dbContext.orgId,
          userId: userId!,
          cartId: cart.id,
          status: 'PAYMENT_PENDING',
          currency: totals.currency,
          subtotal,
          total,
          items: {
            create: cartItems.map((item: typeof cartItems[number]) => ({
              tenantId: dbContext.orgId,
              catalogItemId: item.catalogItemId,
              sku: item.catalogItem.sku ?? '',
              name: item.catalogItem.name,
              quantity: item.quantity,
              unitPrice: Number(item.catalogItem.price),
              lineTotal: Number(item.catalogItem.price) * item.quantity,
            })),
          },
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKED_OUT' },
      });

      await writeAuditLog(tx, {
        realm: 'TENANT',
        tenantId: dbContext.orgId,
        actorType: 'USER',
        actorId: userId ?? null,
        action: 'order.CHECKOUT_COMPLETED',
        entity: 'order',
        entityId: order.id,
        metadataJson: {
          cartId: cart.id,
          itemCount: cart.items.length,
          totals: { subtotal, discountTotal, taxTotal, feeTotal, grandTotal: total, currency: totals.currency, breakdown } as unknown as Prisma.JsonValue,
          orderId: order.id,
          durationMs: Date.now() - t0,
        },
      });

      // GAP-ORDER-LC-001: Record initial lifecycle transition in order_lifecycle_logs (SM canonical table).
      await tx.order_lifecycle_logs.create({
        data: {
          order_id: order.id,
          tenant_id: dbContext.orgId,
          from_state: null,
          to_state: 'PAYMENT_PENDING',
          actor_id: userId ?? null,
          realm: 'tenant',
          request_id: null,
        },
      });

      return {
        orderId: order.id,
        status: order.status,
        currency: totals.currency,
        itemCount: cart.items.length,
        totals: {
          subtotal,
          discountTotal,
          taxableAmount: totals.taxableAmount,
          taxTotal,
          feeTotal,
          grandTotal: total,
          breakdown,
        },
      };
    });

    if ('error' in result) {
      if (result.error === 'CART_NOT_FOUND') return sendNotFound(reply, 'No active cart found');
      if (result.error === 'CART_EMPTY') return sendError(reply, 'BAD_REQUEST', 'Cart is empty', 400);
      if (result.error === 'INVALID_LINE_ITEM') {
        return sendError(reply, 'BAD_REQUEST', `Checkout aborted: ${result.message}`, 400);
      }
    }

    return sendSuccess(reply, result, 201);
  });

  // B6a: explicit select shape for order_lifecycle_logs rows.
  // withDbContext types its callback tx as 'any' (RLS proxy; see database-context.ts).
  // The Prisma select is deterministic — these are the only 4 fields requested.
  type OLLSelectRow = { from_state: string | null; to_state: string; realm: string; created_at: Date };

  /**
   * GET /api/tenant/orders
   * List orders for current tenant user (RLS-enforced)
   */
  fastify.get('/tenant/orders', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const rawOrders = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findMany({
        where: { userId },
        include: {
          items: true,
          // GAP-ORDER-LC-001 B6a: expose canonical lifecycle state + recent log history.
          // RLS SELECT policy on order_lifecycle_logs allows tenant to read own rows.
          // take: 5 bounds payload; select minimises data transfer (no actor_id / request_id).
          order_lifecycle_logs: {
            orderBy: { created_at: 'desc' },
            take: 5,
            select: { from_state: true, to_state: true, realm: true, created_at: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }) as Array<Record<string, unknown> & { order_lifecycle_logs: OLLSelectRow[] }>;
    });

    // Map to camelCase lifecycle shape; preserve all existing fields unchanged.
    const orders = rawOrders.map(rawOrder => {
      const { order_lifecycle_logs, ...order } = rawOrder;
      return {
        ...order,
        lifecycleState: order_lifecycle_logs[0]?.to_state ?? null,
        lifecycleLogs: order_lifecycle_logs.map(l => ({
          fromState: l.from_state,
          toState: l.to_state,
          realm: l.realm,
          createdAt: l.created_at.toISOString(),
        })),
      };
    });

    return sendSuccess(reply, { orders, count: orders.length });
  });

  /**
   * GET /api/tenant/orders/:id
   * Get single order with items (RLS-enforced)
   */
  fastify.get('/tenant/orders/:id', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

    const { id: orderId } = paramsResult.data;
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const rawOrder = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          // GAP-ORDER-LC-001 B6a: expose canonical lifecycle state + recent log history.
          order_lifecycle_logs: {
            orderBy: { created_at: 'desc' },
            take: 5,
            select: { from_state: true, to_state: true, realm: true, created_at: true },
          },
        },
      }) as (Record<string, unknown> & { order_lifecycle_logs: OLLSelectRow[] }) | null;
    });

    if (!rawOrder) return sendNotFound(reply, 'Order not found');

    const { order_lifecycle_logs, ...orderFields } = rawOrder;
    const order = {
      ...orderFields,
      lifecycleState: order_lifecycle_logs[0]?.to_state ?? null,
      lifecycleLogs: order_lifecycle_logs.map(l => ({
        fromState: l.from_state,
        toState: l.to_state,
        realm: l.realm,
        createdAt: l.created_at.toISOString(),
      })),
    };

    return sendSuccess(reply, { order });
  });

  /**
   * PATCH /api/tenant/orders/:id/status
   * SM-driven order status transitions (GAP-ORDER-LC-001-BACKEND-INTEGRATION-001)
   *
   * Transition rules (enforced by StateMachineService via allowed_transitions table):
   *   PAYMENT_PENDING → CONFIRMED  → stored as DB PLACED
   *   PLACED          → FULFILLED  → stored as DB PLACED (order_lifecycle_logs is semantic source of truth)
   *   PAYMENT_PENDING → CANCELLED  → stored as DB CANCELLED
   *   PLACED          → CANCELLED  → stored as DB CANCELLED
   *   CANCELLED       → *          → REJECTED (terminal state)
   *
   * Schema note: orders.status enum only has PAYMENT_PENDING | PLACED | CANCELLED.
   * CONFIRMED and FULFILLED map to PLACED at the DB level; order_lifecycle_logs holds
   * the canonical semantic state. This mapping will be removed when the enum is extended.
   *
   * Role gate: OWNER / ADMIN only (app-layer; D-5 / B1 preserved — app.roles GUC remains dormant).
   * Lifecycle log: written atomically by StateMachineService into order_lifecycle_logs.
   */
  fastify.patch(
    '/tenant/orders/:id/status',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // B1 role gate: OWNER / ADMIN only (D-5 preserved — app-layer enforcement, no DB GUC role check)
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can update order status', 403);
      }

      // Validate path param
      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

      // Validate request body
      const bodySchema = z.object({
        status: z.enum(['CONFIRMED', 'FULFILLED', 'CANCELLED']),
        reason: z.string().min(1).max(2000).trim().optional(),
      });
      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const { id: orderId } = paramsResult.data;
      const { status: requestedStatus, reason } = bodyResult.data;

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Load order in tenant scope — RLS-enforced by withDbContext (org_id scoped)
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) return { error: 'NOT_FOUND' as const };

        const currentDbStatus = order.status; // PAYMENT_PENDING | PLACED | CANCELLED

        // Derive canonical from-state from order_lifecycle_logs (semantic source of truth).
        // The DB status PLACED is ambiguous (CONFIRMED or FULFILLED), so the latest log
        // record is the authoritative SM state. Fall back to DB status if no log exists.
        const latestLog = await tx.order_lifecycle_logs.findFirst({
          where: { order_id: orderId },
          orderBy: { created_at: 'desc' },
        });
        const canonicalFromState: string = latestLog?.to_state ?? currentDbStatus;

        // SM-driven transition (GAP-ORDER-LC-001): validates permitted path + writes order_lifecycle_logs atomically.
        const txBound = makeTxBoundPrisma(tx);
        const smSvc = new StateMachineService(txBound);
        const smResult = await smSvc.transition({
          entityType: 'ORDER',
          entityId: orderId,
          orgId: dbContext.orgId,
          fromStateKey: canonicalFromState,
          toStateKey: requestedStatus,
          actorType: 'TENANT_ADMIN',
          actorUserId: userId ?? null,
          actorRole: userRole ?? 'ADMIN',
          reason: reason ?? `Tenant transition: ${requestedStatus}`,
          requestId: null,
        }, { db: txBound });

        if (smResult.status !== 'APPLIED') {
          const smStatus = smResult.status;
          if (smStatus === 'DENIED') {
            const code = smResult.code;
            if (code === 'TRANSITION_NOT_PERMITTED' || code === 'TRANSITION_FROM_TERMINAL' || code === 'TRANSITION_FROM_IRREVERSIBLE') {
              return { error: 'INVALID_TRANSITION' as const, canonicalFromState, requestedStatus, smStatus: code };
            }
            if (code === 'ACTOR_ROLE_NOT_PERMITTED') {
              return { error: 'FORBIDDEN' as const };
            }
            return { error: 'SM_ERROR' as const, smStatus: code };
          }
          // PENDING_APPROVAL / ESCALATION_REQUIRED — not configured for ORDER in current seed
          return { error: 'SM_ERROR' as const, smStatus };
        }

        // Map semantic requested status → DB OrderStatus enum value.
        // Schema limitation: orders.status enum only has PAYMENT_PENDING | PLACED | CANCELLED.
        // CONFIRMED and FULFILLED map to PLACED; order_lifecycle_logs holds the canonical state.
        const dbStatusUpdate: 'PLACED' | 'CANCELLED' =
          requestedStatus === 'CANCELLED' ? 'CANCELLED' : 'PLACED';

        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status: dbStatusUpdate },
        });

        return { order: updated };
      });

      if (result.error === 'NOT_FOUND') return sendNotFound(reply, 'Order not found');
      if (result.error === 'INVALID_TRANSITION') {
        return sendError(
          reply,
          'ORDER_STATUS_INVALID_TRANSITION',
          `Transition not permitted: ${result.canonicalFromState} → ${result.requestedStatus} (SM: ${result.smStatus})`,
          409
        );
      }
      if (result.error === 'FORBIDDEN') {
        return sendError(reply, 'FORBIDDEN', 'Actor role not permitted for this transition', 403);
      }
      if (result.error === 'SM_ERROR') {
        return sendError(reply, 'INTERNAL_SERVER_ERROR', `State machine error: ${result.smStatus}`, 500);
      }

      return sendSuccess(reply, { order: result.order });
    }
  );

  /**
   * POST /api/tenant/activate
   * User-assisted activation flow
   * Allows a user with an invite to activate their pre-provisioned tenant
   */
  fastify.post('/tenant/activate', async (request, reply) => {
    try {
      const bodySchema = z.object({
        inviteToken: z.string().min(1, 'Invite token is required'),
        userData: z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }),
        tenantData: z
          .object({
            name: z.string().optional(),
            industry: z.string().optional(),
          })
          .optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { inviteToken, userData } = parseResult.data;

      // Hash the invite token to look it up
      const crypto = await import('node:crypto');
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');

      // Look up invite
      const invite = await prisma.invite.findFirst({
        where: {
          tokenHash,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          tenant: {
            include: {
              memberships: true,
            },
          },
        },
      });

      if (!invite) {
        return sendError(reply, 'INVALID_INVITE', 'Invite not found or expired', 404);
      }

      // Check if email matches
      if (invite.email !== userData.email) {
        return sendError(reply, 'EMAIL_MISMATCH', 'Email does not match invite', 403);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Gate D.1: Build db context for invite tenant
      const dbContext: DatabaseContext = {
        orgId: invite.tenantId,
        actorId: invite.tenantId, // System actor for activation
        realm: 'tenant',
        requestId: crypto.randomUUID(),
      };

      // G-014: Single atomic transaction — nested $transaction removed.
      // All activation writes + audit log execute in one connection, one context lifecycle.
      const result = await withDbContext(prisma, dbContext, async tx => {
        // Stop-loss: assert app.org_id context is set to expected tenantId before any writes
        const [ctxRow] = await tx.$queryRaw<[{ org_id: string }]>`
          SELECT current_setting('app.org_id', true) AS org_id
        `;
        if (ctxRow?.org_id !== invite.tenantId) {
          throw new Error(
            `[G-014] Activation stop-loss: app.org_id mismatch. ` +
              `Expected ${invite.tenantId}, got ${ctxRow?.org_id}`
          );
        }

        // Create or find user
        let user = await tx.user.findUnique({
          where: { email: userData.email },
        });

        user ??= await tx.user.create({
          data: {
            email: userData.email,
            passwordHash,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        // Create membership (RLS will enforce tenant_id = org_id)
        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            tenantId: invite.tenantId,
            role: invite.role,
          },
        });

        // Mark invite as accepted (RLS-enforced update)
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        // Write audit log inside the same transaction — atomic with activation writes (G-014)
        await writeAuditLog(tx, {
          tenantId: invite.tenantId,
          realm: 'TENANT',
          actorType: 'USER',
          actorId: user.id,
          action: 'user.activated',
          entity: 'user',
          entityId: user.id,
          metadataJson: {
            inviteId: invite.id,
            role: invite.role,
          },
        });

        return { user, membership };
      });

      // Issue tenant JWT — same claims as POST /api/auth/login tenant path
      const token = await reply.tenantJwtSign({
        userId: result.user.id,
        tenantId: invite.tenantId,
        role: result.membership.role,
      });

      return sendSuccess(reply, {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        tenant: {
          id: invite.tenant.id,
          name: invite.tenant.name,
          slug: invite.tenant.slug,
          type: invite.tenant.type,
        },
        membership: {
          role: result.membership.role,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Tenant Activation] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Activation failed', 500);
    }
  });

  /**
   * POST /api/tenant/memberships
   * Create/invite a new member to the tenant
   * Requires OWNER or ADMIN role
   */
  fastify.post(
    '/tenant/memberships',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { tenantId, userRole } = request;

      // Early guard for tenant context (guaranteed by middleware)
      if (!tenantId) {
        return sendError(reply, 'UNAUTHORIZED', 'Tenant context missing', 401);
      }

      // Check permission
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      try {
        const bodySchema = z.object({
          email: z.string().email('Invalid email'),
          role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
        });

        const parseResult = bodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return sendValidationError(reply, parseResult.error.errors);
        }

        const { email, role } = parseResult.data;

        // Create invite token
        const crypto = await import('node:crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Gate D.1: RLS-enforced invite creation (manual tenantId removed)
        const dbContext = request.dbContext;
        if (!dbContext) {
          return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
        }

        const invite = await withDbContext(prisma, dbContext, async tx => {
          return await tx.invite.create({
            data: {
              tenantId,
              email,
              role,
              tokenHash,
              expiresAt,
            },
          });
        });

        // Write audit log
        await writeAuditLog(prisma, {
          tenantId: tenantId ?? null,
          realm: 'TENANT',
          actorType: 'USER',
          actorId: request.userId ?? null,
          action: 'member.invited',
          entity: 'invite',
          entityId: invite.id,
          metadataJson: {
            email,
            role,
          },
        });

        // G-012: Fire-and-forget invite email — errors logged, never block invite creation
        // G-015 Phase C: org display name read via admin-context (organizations.legal_name)
        try {
          let orgDisplayName = 'your organization';
          if (tenantId) {
            const org = await getOrganizationIdentity(tenantId, prisma);
            orgDisplayName = org.legal_name;
          }
          await sendInviteMemberEmail(
            email,
            token,
            orgDisplayName,
            {
              tenantId: tenantId ?? null,
              triggeredBy: 'user',
              actorId: request.userId ?? null,
            }
          );
        } catch (emailErr) {
          fastify.log.error({ err: emailErr }, '[Invite] Email send failed (non-fatal)');
        }

        return sendSuccess(reply, {
          invite: {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt,
          },
          inviteToken: token, // Return token for email delivery
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, '[Create Membership] Error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to invite member', 500);
      }
    }
  );

  /**
   * PUT /api/tenant/branding
   * Update tenant branding settings
   * Requires OWNER or ADMIN role
   */
  fastify.put('/tenant/branding', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { tenantId, userRole } = request;

    // Check permission
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
    }

    try {
      const bodySchema = z.object({
        logoUrl: z.string().url().optional().nullable(),
        themeJson: z
          .object({
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
          })
          .optional()
          .nullable(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { logoUrl, themeJson } = parseResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Update or create branding (RLS handles tenant boundary)
      const branding = await withDbContext(prisma, dbContext, async tx => {
        // For upsert, WHERE clause without tenant_id (RLS filters reads)
        // For CREATE, use orgId from context
        return await tx.tenantBranding.upsert({
          where: { tenantId: dbContext.orgId },
          create: {
            tenantId: dbContext.orgId,
            logoUrl: logoUrl ?? undefined,
            themeJson: themeJson ?? undefined,
          },
          update: {
            logoUrl: logoUrl ?? undefined,
            themeJson: themeJson ?? undefined,
          },
        });
      });

      // Write audit log
      await writeAuditLog(prisma, {
        tenantId: tenantId ?? null,
        realm: 'TENANT',
        actorType: 'USER',
        actorId: request.userId ?? null,
        action: 'branding.updated',
        entity: 'branding',
        entityId: branding.id,
        metadataJson: {
          logoUrl,
          themeJson,
        },
      });

      return sendSuccess(reply, { branding });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Update Branding] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to update branding', 500);
    }
  });

  // ─── G-025: DPP Snapshot API ─────────────────────────────────────────────────
  // GET /api/tenant/dpp/:nodeId
  // Read-only. Queries 3 SQL views created in TECS 4B (G-025-DPP-SNAPSHOT-VIEWS-IMPLEMENT-001).
  // RLS inheritance: views are SECURITY INVOKER; tenant context set by withDbContext; no SECURITY DEFINER allowed.
  // G-025-ORGS-RLS-001 ✅ VALIDATED (commit afcf47e) — manufacturer fields restored (TECS 5C1/5C2).

  // --- Row type interfaces for $queryRaw ---
  interface DppProductRow {
    node_id: string;
    org_id: string;
    batch_id: string | null;
    node_type: string | null;
    meta: unknown;
    geo_hash: string | null;
    visibility: string | null;
    created_at: Date;
    updated_at: Date;
    manufacturer_name: string | null;
    manufacturer_jurisdiction: string | null;
    manufacturer_registration_no: string | null;
  }

  interface DppLineageRow {
    root_node_id: string;
    node_id: string;
    parent_node_id: string | null;
    depth: number;
    edge_type: string | null;
    org_id: string;
    created_at: Date;
  }

  interface DppCertRow {
    node_id: string | null;
    certification_id: string | null;
    certification_type: string | null;
    lifecycle_state_id: string | null;
    expiry_date: Date | null;
    org_id: string;
  }

  /**
   * GET /api/tenant/dpp/:nodeId
   *
   * Returns a Digital Product Passport snapshot for a given traceability node.
   * Data comes from three SECURITY INVOKER views created in TECS 4B:
   *   - dpp_snapshot_products_v1       (node identity + manufacturer fields via organizations LEFT JOIN)
   *   - dpp_snapshot_lineage_v1        (supply-chain lineage graph via recursive CTE)
   *   - dpp_snapshot_certifications_v1 (org → node cert linkages via node_certifications)
   *
   * G-025-ORGS-RLS-001 ✅ VALIDATED — manufacturer_* fields now returned from view (TECS 5C1).
   * organizations JOIN is in the view only; this route queries the view, not organizations directly.
   */
  fastify.get(
    '/tenant/dpp/:nodeId',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const paramsSchema = z.object({ nodeId: z.string().uuid('nodeId must be a valid UUID') });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

      const { nodeId } = paramsResult.data;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // ── 1. Query all three views inside a single tenant-scoped $transaction ──
      const [productRows, lineageRows, certRows] = await withDbContext(
        prisma,
        dbContext,
        async tx => {
          // RLS inheritance: views are SECURITY INVOKER; tenant context set by withDbContext; no SECURITY DEFINER allowed.
          // All queries are parameterized — no string interpolation.
          const products = await tx.$queryRaw<DppProductRow[]>`
            SELECT
              node_id, org_id, batch_id, node_type, meta,
              geo_hash, visibility, created_at, updated_at,
              manufacturer_name, manufacturer_jurisdiction, manufacturer_registration_no
            FROM dpp_snapshot_products_v1
            WHERE node_id = ${nodeId}::uuid
          `;

          const lineage = await tx.$queryRaw<DppLineageRow[]>`
            SELECT
              root_node_id, node_id, parent_node_id,
              depth, edge_type, org_id, created_at
            FROM dpp_snapshot_lineage_v1
            WHERE root_node_id = ${nodeId}::uuid
          `;

          const certs = await tx.$queryRaw<DppCertRow[]>`
            SELECT
              node_id, certification_id, certification_type,
              lifecycle_state_id, expiry_date, org_id
            FROM dpp_snapshot_certifications_v1
            WHERE node_id = ${nodeId}::uuid
               OR (node_id IS NULL AND org_id = (
                 SELECT org_id FROM dpp_snapshot_products_v1 WHERE node_id = ${nodeId}::uuid LIMIT 1
               ))
          `;

          return [products, lineage, certs] as [DppProductRow[], DppLineageRow[], DppCertRow[]];
        },
      );

      // ── 2. 404 if no product row — RLS may hide the node from this tenant ──
      if (productRows.length === 0) {
        return sendNotFound(reply, 'DPP snapshot not found or access denied');
      }

      const product = productRows[0];

      // ── 3. Write read-audit entry ──────────────────────────────────────────
      await writeAuditLog(prisma, {
        tenantId: request.tenantId ?? null,
        realm: 'TENANT',
        actorType: 'USER',
        actorId: request.userId ?? null,
        action: 'tenant.dpp.read',
        entity: 'traceability_node',
        entityId: nodeId,
        metadataJson: { nodeId, orgId: dbContext.orgId },
      });

      // ── 4. Shape response ──────────────────────────────────────────────────
      return sendSuccess(reply, {
        nodeId,
        product: {
          nodeId: product.node_id,
          orgId: product.org_id,
          batchId: product.batch_id,
          nodeType: product.node_type,
          meta: product.meta,
          geoHash: product.geo_hash,
          visibility: product.visibility,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          manufacturerName: product.manufacturer_name,
          manufacturerJurisdiction: product.manufacturer_jurisdiction,
          manufacturerRegistrationNo: product.manufacturer_registration_no,
        },
        lineage: lineageRows.map(row => ({
          rootNodeId: row.root_node_id,
          nodeId: row.node_id,
          parentNodeId: row.parent_node_id,
          depth: row.depth,
          edgeType: row.edge_type,
          createdAt: row.created_at,
        })),
        certifications: certRows.map(row => ({
          nodeId: row.node_id,
          certificationId: row.certification_id,
          certificationType: row.certification_type,
          lifecycleStateId: row.lifecycle_state_id,
          expiryDate: row.expiry_date,
          orgId: row.org_id,
        })),
        meta: {},
      });
    },
  );

  // ─── G-022: Tenant escalation routes ────────────────────────────────────────
  // GET  /api/tenant/escalations
  // POST /api/tenant/escalations
  await fastify.register(tenantEscalationRoutes, { prefix: '/tenant/escalations' });

  // ─── G-017: Tenant trade routes ──────────────────────────────────────────────
  // POST /api/tenant/trades
  // POST /api/tenant/trades/:id/transition
  await fastify.register(tenantTradesRoutes, { prefix: '/tenant/trades' });

  // ─── G-018: Escrow Governance Routes ───────────────────────────────────────
  // POST /api/tenant/escrows
  // POST /api/tenant/escrows/:escrowId/transactions
  // POST /api/tenant/escrows/:escrowId/transition
  // GET  /api/tenant/escrows
  // GET  /api/tenant/escrows/:escrowId
  await fastify.register(tenantEscrowRoutes, { prefix: '/tenant/escrows' });

  // ─── G-019: Settlement Routes ─────────────────────────────────────────────
  // POST /api/tenant/settlements/preview
  // POST /api/tenant/settlements
  await fastify.register(tenantSettlementRoutes, { prefix: '/tenant/settlements' });

  // ─── G-019: Certification Routes ─────────────────────────────────────────
  // POST  /api/tenant/certifications
  // GET   /api/tenant/certifications
  // GET   /api/tenant/certifications/:id
  // PATCH /api/tenant/certifications/:id
  // POST  /api/tenant/certifications/:id/transition
  await fastify.register(tenantCertificationRoutes, { prefix: '/tenant/certifications' });

  // ─── G-016: Traceability Graph Routes (Phase A) ──────────────────────────────
  // POST  /api/tenant/traceability/nodes
  // GET   /api/tenant/traceability/nodes
  // GET   /api/tenant/traceability/nodes/:id/neighbors
  // POST  /api/tenant/traceability/edges
  // GET   /api/tenant/traceability/edges
  await fastify.register(tenantTraceabilityRoutes, { prefix: '/tenant/traceability' });

  // ─── G-026 TECS 6D: Domain CRUD (OPS-WLADMIN-DOMAINS-001) ────────────────
  // GET    /api/tenant/domains        — list custom domains for current tenant
  // POST   /api/tenant/domains        — add a custom domain (OWNER/ADMIN)
  // DELETE /api/tenant/domains/:id    — remove a custom domain (OWNER/ADMIN)
  // Governance: GOVERNANCE-SYNC-093

  /**
   * GET /api/tenant/domains
   * List custom domains registered for the current tenant.
   */
  fastify.get(
    '/tenant/domains',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const domains = await withDbContext(prisma, dbContext, async tx => {
        return tx.tenantDomain.findMany({
          where: { tenantId: dbContext.orgId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            domain: true,
            verified: true,
            primary: true,
            createdAt: true,
          },
        });
      });

      return sendSuccess(reply, { domains });
    },
  );

  /**
   * POST /api/tenant/domains
   * Add a custom domain for the current tenant (OWNER or ADMIN only).
   * Emits cache invalidation after commit.
   */
  fastify.post(
    '/tenant/domains',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: OWNER or ADMIN only
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can add domains', 403);
      }

      const bodySchema = z.object({
        domain: z
          .string()
          .min(1)
          .max(255)
          .regex(
            /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/,
            'Invalid domain format — must be lowercase, no scheme, no path, no port',
          ),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { domain } = parseResult.data;

      let created: { id: string; domain: string; verified: boolean; primary: boolean; createdAt: Date };
      try {
        created = await withDbContext(prisma, dbContext, async tx => {
          const row = await tx.tenantDomain.create({
            data: {
              tenantId: dbContext.orgId,
              domain,
              verified: false,
              primary: false,
            },
            select: {
              id: true,
              domain: true,
              verified: true,
              primary: true,
              createdAt: true,
            },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'domain.added',
            entity: 'tenant_domain',
            entityId: row.id,
            metadataJson: { domain },
          });

          return row;
        });
      } catch (err: unknown) {
        // Unique constraint violation — domain already claimed (possibly by another tenant).
        // Return generic 409 to avoid information leakage.
        const e = err as { code?: string };
        if (e?.code === 'P2002') {
          return sendError(reply, 'CONFLICT', 'Domain is already registered', 409);
        }
        throw err;
      }

      // Emit cache invalidation — best-effort, direct function call (no HTTP).
      emitCacheInvalidate([domain], 'domain_crud', request.log);

      return sendSuccess(reply, { domain: created }, 201);
    },
  );

  /**
   * DELETE /api/tenant/domains/:id
   * Remove a custom domain (OWNER or ADMIN only, tenantId-scoped).
   * Emits cache invalidation after commit.
   */
  fastify.delete(
    '/tenant/domains/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: OWNER or ADMIN only
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can remove domains', 403);
      }

      const { id } = request.params as { id: string };

      // Find domain — must belong to this tenant (RLS + explicit tenantId guard).
      const existing = await withDbContext(prisma, dbContext, async tx => {
        return tx.tenantDomain.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true, domain: true },
        });
      });

      if (!existing) {
        return sendNotFound(reply, 'Domain not found');
      }

      await withDbContext(prisma, dbContext, async tx => {
        await tx.tenantDomain.delete({ where: { id: existing.id } });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'domain.removed',
          entity: 'tenant_domain',
          entityId: existing.id,
          metadataJson: { domain: existing.domain },
        });
      });

      // Emit cache invalidation — best-effort, direct function call (no HTTP).
      emitCacheInvalidate([existing.domain], 'domain_crud', request.log);

      return sendSuccess(reply, { deleted: existing.id });
    },
  );
};

export default tenantRoutes;
