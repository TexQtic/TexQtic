import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
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
} from '../lib/database-context.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { computeTotals, TotalsInputError } from '../services/pricing/totals.service.js';
import { sendInviteMemberEmail } from '../services/email/email.service.js';
import bcrypt from 'bcryptjs';

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
   * Manual tenant filter removed; RLS policies handle tenant boundary
   */
  fastify.get(
    '/tenant/memberships',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
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

    const orders = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
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

    const order = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
    });

    if (!order) return sendNotFound(reply, 'Order not found');
    return sendSuccess(reply, { order });
  });

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

      return sendSuccess(reply, {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        tenant: {
          id: invite.tenant.id,
          name: invite.tenant.name,
          slug: invite.tenant.slug,
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
        try {
          const tenantRecord = await prisma.tenant.findUnique({
            where: { id: tenantId ?? '' },
            select: { name: true },
          });
          await sendInviteMemberEmail(
            email,
            token,
            tenantRecord?.name ?? 'your organization',
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
};

export default tenantRoutes;
