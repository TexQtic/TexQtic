/**
 * TexQtic Cart Service
 *
 * Provides cart operations with backend persistence:
 * - Create/get cart
 * - Add items
 * - Update quantities
 * - Remove items
 */

import { tenantGet, tenantPost, tenantPatch } from './tenantApiClient';

export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  active: boolean;
}

export interface CartItem {
  id: string;
  cartId: string;
  catalogItemId: string;
  quantity: number;
  catalogItem: CatalogItem;
}

export interface Cart {
  id: string;
  tenantId: string;
  userId: string;
  status: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  catalogItemId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

/**
 * Get or create active cart for current user
 * Idempotent operation
 */
export async function getOrCreateCart(): Promise<Cart> {
  const response = await tenantPost<{ cart: Cart }>('/api/tenant/cart');
  return response.cart;
}

/**
 * Get current active cart
 */
export async function getCart(): Promise<Cart | null> {
  const response = await tenantGet<{ cart: Cart | null }>('/api/tenant/cart');
  return response.cart;
}

/**
 * Add item to cart or increment quantity if already present
 */
export async function addToCart(request: AddToCartRequest): Promise<CartItem> {
  const response = await tenantPost<{ cartItem: CartItem }>('/api/tenant/cart/items', request);
  return response.cartItem;
}

/**
 * Update cart item quantity or remove if quantity is 0
 */
export async function updateCartItem(
  itemId: string,
  request: UpdateCartItemRequest
): Promise<CartItem | { removed: true }> {
  const response = await tenantPatch<{ cartItem?: CartItem; removed?: boolean }>(
    `/api/tenant/cart/items/${itemId}`,
    request
  );

  if (response.removed) {
    return { removed: true };
  }

  return response.cartItem!;
}

/**
 * Remove item from cart (alias for updateCartItem with quantity 0)
 */
export async function removeCartItem(itemId: string): Promise<void> {
  await updateCartItem(itemId, { quantity: 0 });
}

/**
 * Calculate cart subtotal
 */
export function calculateSubtotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => {
    return sum + item.catalogItem.price * item.quantity;
  }, 0);
}

// ==================== CHECKOUT (G-W3-ROUTING-001) ====================

export interface CheckoutTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  feeTotal: number;
  grandTotal: number;
  breakdown: Record<string, unknown>;
}

export interface CheckoutResult {
  orderId: string;
  status: string;
  currency: string;
  itemCount: number;
  totals: CheckoutTotals;
}

/**
 * Convert active cart into an order (POST /api/tenant/checkout).
 * On success, the cart is marked CHECKED_OUT on the server.
 * Callers should call refreshCart() afterwards to clear local cart state.
 */
export async function checkout(): Promise<CheckoutResult> {
  return tenantPost<CheckoutResult>('/api/tenant/checkout', {});
}
