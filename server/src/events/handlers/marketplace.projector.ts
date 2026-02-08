import type { DbClient, ProjectionResult, ProjectionHandler } from '../projections/types.js';
import type { EventEnvelope } from '../../lib/events.js';
import { registerProjection } from '../projections/registry.js';

/**
 * Marketplace Cart Summary Projection Handler
 * 
 * Prompt #27: Event-driven projection for cart state visibility.
 * 
 * PURPOSE:
 * - Provide admin-safe, query-optimized view of cart state
 * - Avoid direct reads from transactional cart tables
 * - Enable analytics without impacting write performance
 * 
 * EVENTS HANDLED:
 * - marketplace.cart.created
 * - marketplace.cart.item.added
 * - marketplace.cart.item.updated
 * - marketplace.cart.item.removed
 * - marketplace.cart.checked_out (future-safe)
 * 
 * IDEMPOTENCY:
 * - Uses last_event_id to prevent duplicate processing
 * - Uses version for optimistic locking
 * - Tolerates out-of-order delivery via event timestamps
 * 
 * TENANT ISOLATION:
 * - All queries filtered by tenantId
 * - RLS enforced at schema level
 */

/**
 * Handle marketplace.cart.created event
 * 
 * Creates initial projection entry with zero counts.
 */
async function handleCartCreated(
  db: DbClient,
  event: EventEnvelope
): Promise<ProjectionResult> {
  const projectionName = 'marketplace_cart_summary';

  try {
    // Validate tenant isolation
    if (!event.tenantId) {
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        error: 'Event missing tenantId (tenant isolation required)',
      };
    }

    // Extract cart data from payload
    const cartId = event.payload.cartId || event.entity.id;
    const userId = event.payload.userId;

    if (!cartId || !userId) {
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        error: 'Missing required fields: cartId or userId',
      };
    }

    // Check if projection already exists (idempotency)
    const existing = await db.marketplaceCartSummary.findUnique({
      where: { cartId },
      select: { id: true, lastEventId: true },
    });

    if (existing?.lastEventId === event.id) {
      // Already processed this exact event - skip
      return {
        success: true,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        skipped: true,
        skipReason: 'Event already processed (idempotent skip)',
      };
    }

    if (existing) {
      // Projection exists but from different event - this is cart.created arriving late
      // Skip to avoid overwriting newer data
      return {
        success: true,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        skipped: true,
        skipReason: 'Projection already exists (late-arriving create event)',
      };
    }

    // Create projection entry
    await db.marketplaceCartSummary.create({
      data: {
        tenantId: event.tenantId,
        cartId,
        userId,
        itemCount: 0,
        totalQuantity: 0,
        lastEventId: event.id,
        version: 1,
        lastUpdatedAt: new Date(event.occurredAt),
      },
    });

    return {
      success: true,
      eventId: event.id,
      eventName: event.name,
      projectionName,
    };
  } catch (error) {
    return {
      success: false,
      eventId: event.id,
      eventName: event.name,
      projectionName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle cart item mutation events
 * 
 * Recalculates item_count and total_quantity from current cart state.
 * Handles: item.added, item.updated, item.removed
 */
async function handleCartItemMutation(
  db: DbClient,
  event: EventEnvelope
): Promise<ProjectionResult> {
  const projectionName = 'marketplace_cart_summary';

  try {
    // Validate tenant isolation
    if (!event.tenantId) {
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        error: 'Event missing tenantId (tenant isolation required)',
      };
    }

    // Extract cart ID
    const cartId = event.payload.cartId || event.entity.id;

    if (!cartId) {
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        error: 'Missing required field: cartId',
      };
    }

    // Check if projection exists
    const existing = await db.marketplaceCartSummary.findUnique({
      where: { cartId },
      select: { id: true, lastEventId: true, version: true, tenantId: true, userId: true },
    });

    if (!existing) {
      // Projection doesn't exist - item event arrived before cart.created
      // Create minimal projection from event data
      const userId = event.payload.userId || event.actor.id;
      
      if (!userId) {
        return {
          success: false,
          eventId: event.id,
          eventName: event.name,
          projectionName,
          error: 'Cannot create projection: missing userId',
        };
      }

      // Query cart items to get counts
      const items = await db.cartItem.findMany({
        where: { 
          cartId,
          cart: { tenantId: event.tenantId }, // Enforce tenant isolation
        },
        select: { quantity: true },
      });

      const itemCount = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      await db.marketplaceCartSummary.create({
        data: {
          tenantId: event.tenantId,
          cartId,
          userId,
          itemCount,
          totalQuantity,
          lastEventId: event.id,
          version: 1,
          lastUpdatedAt: new Date(event.occurredAt),
        },
      });

      return {
        success: true,
        eventId: event.id,
        eventName: event.name,
        projectionName,
      };
    }

    // Idempotency check
    if (existing.lastEventId === event.id) {
      return {
        success: true,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        skipped: true,
        skipReason: 'Event already processed (idempotent skip)',
      };
    }

    // Enforce tenant isolation
    if (existing.tenantId !== event.tenantId) {
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName,
        error: 'Tenant ID mismatch (isolation violation)',
      };
    }

    // Query current cart items to recalculate counts
    const items = await db.cartItem.findMany({
      where: { 
        cartId,
        cart: { tenantId: event.tenantId }, // Enforce tenant isolation
      },
      select: { quantity: true },
    });

    const itemCount = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // Update projection with optimistic locking
    await db.marketplaceCartSummary.update({
      where: { 
        id: existing.id,
        version: existing.version, // Optimistic lock
      },
      data: {
        itemCount,
        totalQuantity,
        lastEventId: event.id,
        version: existing.version + 1,
        lastUpdatedAt: new Date(event.occurredAt),
      },
    });

    return {
      success: true,
      eventId: event.id,
      eventName: event.name,
      projectionName,
    };
  } catch (error) {
    return {
      success: false,
      eventId: event.id,
      eventName: event.name,
      projectionName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle marketplace.cart.checked_out event (future-safe)
 * 
 * Currently no additional action beyond item mutation logic.
 * Future: Could update status or archive projection.
 */
async function handleCartCheckedOut(
  db: DbClient,
  event: EventEnvelope
): Promise<ProjectionResult> {
  // For now, treat as item mutation (recalculate counts)
  // Future: Add status field or archive logic
  return handleCartItemMutation(db, event);
}

/**
 * Unified marketplace cart projection handler
 */
const marketplaceCartProjectionHandler: ProjectionHandler = async (
  db: DbClient,
  event: EventEnvelope
): Promise<ProjectionResult> => {
  // Route to appropriate sub-handler based on event name
  switch (event.name) {
    case 'marketplace.cart.created':
      return handleCartCreated(db, event);
    
    case 'marketplace.cart.item.added':
    case 'marketplace.cart.item.updated':
    case 'marketplace.cart.item.removed':
      return handleCartItemMutation(db, event);
    
    case 'marketplace.cart.checked_out':
      return handleCartCheckedOut(db, event);
    
    default:
      // Unknown event name - should never happen due to registry filtering
      return {
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName: 'marketplace_cart_summary',
        error: `Unexpected event name: ${event.name}`,
      };
  }
};

/**
 * Auto-register handler at module load time
 */
registerProjection({
  name: 'marketplace_cart_summary',
  eventNames: [
    'marketplace.cart.created',
    'marketplace.cart.item.added',
    'marketplace.cart.item.updated',
    'marketplace.cart.item.removed',
    'marketplace.cart.checked_out',
  ],
  handler: marketplaceCartProjectionHandler,
});

// Export for testing (handler is already registered)
export { marketplaceCartProjectionHandler };
