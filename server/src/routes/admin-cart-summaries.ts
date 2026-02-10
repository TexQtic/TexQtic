import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';

/**
 * Admin Cart Summaries Routes
 *
 * Domain: marketplace (projection read-side)
 * Plane: control-plane (admin-only)
 * Purpose: Read-only access to MarketplaceCartSummary projections
 * Security: Admin auth required, tenant isolation enforced
 *
 * Endpoints:
 * - GET /marketplace/cart-summaries - List cart summaries with filters
 * - GET /marketplace/cart-summaries/:cart_id - Get cart summary by cart ID
 */

const adminCartSummariesRoutes: FastifyPluginAsync = async fastify => {
  // All routes require admin auth
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * GET /marketplace/cart-summaries
   * List cart summaries with filtering and pagination
   *
   * Query params:
   * - tenant_id (optional): Filter by tenant ID (if omitted, returns all tenants)
   * - limit (optional): Results per page (default 50, max 200)
   * - cursor (optional): Pagination cursor (cart summary ID)
   * - updated_after (optional): Filter by last_updated_at >= ISO date
   */
  fastify.get('/cart-summaries', async (request, reply) => {
    // Schema for query validation
    const querySchema = z.object({
      tenant_id: z.string().uuid('tenant_id must be a valid UUID').optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      cursor: z.string().uuid().optional(),
      updated_after: z.string().datetime().optional(),
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error);
    }

    const { tenant_id, limit, cursor, updated_after } = parseResult.data;

    try {
      const summaries = await withDbContext({ isAdmin: true }, async () => {
        // Build where clause
        const where: {
          tenantId?: string;
          id?: { gt: string };
          lastUpdatedAt?: { gte: Date };
        } = {};

        // Optional tenant filter
        if (tenant_id) {
          where.tenantId = tenant_id;
        }

        // Cursor-based pagination
        if (cursor) {
          where.id = { gt: cursor };
        }

        // Temporal filter
        if (updated_after) {
          where.lastUpdatedAt = { gte: new Date(updated_after) };
        }

        // Query projection table ONLY
        const items = await prisma.marketplaceCartSummary.findMany({
          where,
          orderBy: [
            { lastUpdatedAt: 'desc' },
            { id: 'asc' }, // Secondary sort for stable pagination
          ],
          take: limit + 1, // Fetch one extra to check if there's a next page
          select: {
            id: true,
            tenantId: true,
            cartId: true,
            userId: true,
            itemCount: true,
            totalQuantity: true,
            lastEventId: true,
            version: true,
            lastUpdatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Determine if there's a next page
        const hasMore = items.length > limit;
        const results = hasMore ? items.slice(0, limit) : items;
        const nextCursor = hasMore ? results[results.length - 1].id : undefined;

        return {
          items: results,
          next_cursor: nextCursor,
          page_size: results.length,
          has_more: hasMore,
        };
      });

      return sendSuccess(reply, summaries);
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch cart summaries');
      return sendError(reply, 'FETCH_FAILED', 'Failed to retrieve cart summaries', 500);
    }
  });

  /**
   * GET /marketplace/cart-summaries/:cart_id
   * Get a single cart summary by cart ID
   *
   * Path params:
   * - cart_id: UUID of the cart
   *
   * Note: Admin bypasses tenant isolation but response still includes tenantId
   */
  fastify.get('/cart-summaries/:cart_id', async (request, reply) => {
    const paramsSchema = z.object({
      cart_id: z.string().uuid('cart_id must be a valid UUID'),
    });

    const parseResult = paramsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error);
    }

    const { cart_id } = parseResult.data;

    try {
      const summary = await withDbContext({ isAdmin: true }, async () => {
        // Query projection table ONLY (not Cart, CartItem, or CatalogItem)
        return await prisma.marketplaceCartSummary.findUnique({
          where: { cartId: cart_id },
          select: {
            id: true,
            tenantId: true,
            cartId: true,
            userId: true,
            itemCount: true,
            totalQuantity: true,
            lastEventId: true,
            version: true,
            lastUpdatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });

      if (!summary) {
        return sendError(
          reply,
          'CART_SUMMARY_NOT_FOUND',
          'Cart summary not found for the given cart ID',
          404
        );
      }

      return sendSuccess(reply, { summary });
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch cart summary');
      return sendError(reply, 'FETCH_FAILED', 'Failed to retrieve cart summary', 500);
    }
  });
};

export default adminCartSummariesRoutes;
