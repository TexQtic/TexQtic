import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';

const tenantRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/me
   * Get current authenticated user (tenant realm)
   */
  fastify.get('/me', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { userId, tenantId, userRole } = request;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        plan: true,
      },
    });

    return sendSuccess(reply, {
      user,
      tenant,
      role: userRole,
    });
  });

  /**
   * GET /api/tenant/audit-logs
   * Get audit logs for current tenant only
   */
  fastify.get('/tenant/audit-logs', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { tenantId } = request;

    const logs = await withDbContext({ tenantId }, async () => {
      return await prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/tenant/memberships
   * Get memberships for current tenant (tests RLS)
   */
  fastify.get(
    '/tenant/memberships',
    { onRequest: tenantAuthMiddleware },
    async (request, reply) => {
      const { tenantId } = request;

      const memberships = await withDbContext({ tenantId }, async () => {
        return await prisma.membership.findMany({
          where: { tenantId },
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
   * GET /api/tenant/catalog/items
   * Read tenant-visible catalog items with cursor pagination
   */
  fastify.get(
    '/tenant/catalog/items',
    { onRequest: tenantAuthMiddleware },
    async (request, reply) => {
      const { tenantId } = request;

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

      const items = await withDbContext({ tenantId }, async () => {
        return await prisma.catalogItem.findMany({
          where: {
            tenantId,
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
   * POST /api/tenant/cart
   * Create or return active cart for authenticated tenant user (idempotent)
   */
  fastify.post('/tenant/cart', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { tenantId, userId } = request;

    const result = await withDbContext({ tenantId }, async () => {
      return await prisma.$transaction(async tx => {
        // Find existing active cart
        let cart = await tx.cart.findFirst({
          where: {
            tenantId,
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
              tenantId: tenantId!,
              userId: userId!,
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
            tenantId: tenantId ?? null,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'cart.CART_CREATED',
            entity: 'cart',
            entityId: cart.id,
            metadataJson: {
              cartId: cart.id,
              tenantId,
              userId,
            },
          });
        }

        return cart;
      });
    });

    return sendSuccess(reply, { cart: result }, 201);
  });

  /**
   * GET /api/tenant/cart
   * Get active cart with items for current tenant user
   */
  fastify.get('/tenant/cart', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { tenantId, userId } = request;

    const cart = await withDbContext({ tenantId }, async () => {
      return await prisma.cart.findFirst({
        where: {
          tenantId,
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
   */
  fastify.post(
    '/tenant/cart/items',
    { onRequest: tenantAuthMiddleware },
    async (request, reply) => {
      const { tenantId, userId } = request;

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

      const result = await withDbContext({ tenantId }, async () => {
        return await prisma.$transaction(async tx => {
          // Validate catalog item exists, belongs to tenant, and is active
          const catalogItem = await tx.catalogItem.findUnique({
            where: { id: catalogItemId },
          });

          if (!catalogItem) {
            return { error: 'CATALOG_ITEM_NOT_FOUND' };
          }

          if (catalogItem.tenantId !== tenantId) {
            return { error: 'FORBIDDEN' };
          }

          if (!catalogItem.active) {
            return { error: 'CATALOG_ITEM_INACTIVE' };
          }

          // Ensure active cart exists (create if missing)
          let cart = await tx.cart.findFirst({
            where: {
              tenantId,
              userId,
              status: 'ACTIVE',
            },
          });

          if (!cart) {
            cart = await tx.cart.create({
              data: {
                tenantId: tenantId!,
                userId: userId!,
                status: 'ACTIVE',
              },
            });

            await writeAuditLog(tx, {
              realm: 'TENANT',
              tenantId: tenantId ?? null,
              actorType: 'USER',
              actorId: userId ?? null,
              action: 'cart.CART_CREATED',
              entity: 'cart',
              entityId: cart.id,
              metadataJson: { cartId: cart.id, tenantId, userId },
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
            tenantId: tenantId ?? null,
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
      });

      if ('error' in result) {
        if (result.error === 'CATALOG_ITEM_NOT_FOUND') {
          return sendNotFound(reply, 'Catalog item not found');
        }
        if (result.error === 'FORBIDDEN') {
          return sendError(reply, 'FORBIDDEN', 'Catalog item does not belong to this tenant', 403);
        }
        if (result.error === 'CATALOG_ITEM_INACTIVE') {
          return sendError(reply, 'BAD_REQUEST', 'Catalog item is not active', 400);
        }
      }

      return sendSuccess(reply, { cartItem: result.cartItem }, 201);
    }
  );

  /**
   * PATCH /api/tenant/cart/items/:id
   * Update cart item quantity or remove if quantity is 0
   */
  fastify.patch(
    '/tenant/cart/items/:id',
    { onRequest: tenantAuthMiddleware },
    async (request, reply) => {
      const { tenantId, userId } = request;

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

      const result = await withDbContext({ tenantId }, async () => {
        return await prisma.$transaction(async tx => {
          // Find cart item and verify it belongs to user's active cart
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

          if (
            cartItem.cart.tenantId !== tenantId ||
            cartItem.cart.userId !== userId ||
            cartItem.cart.status !== 'ACTIVE'
          ) {
            return { error: 'FORBIDDEN' };
          }

          // If quantity is 0, remove the item
          if (quantity === 0) {
            await tx.cartItem.delete({
              where: { id: cartItemId },
            });

            await writeAuditLog(tx, {
              realm: 'TENANT',
              tenantId: tenantId ?? null,
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
            tenantId,
            actorType: 'USER',
            actorId: userId,
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
};

export default tenantRoutes;
