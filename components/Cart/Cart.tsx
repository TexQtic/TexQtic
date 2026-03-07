/**
 * Cart Component
 *
 * Displays cart items with quantity controls and subtotal
 * Wave 7: Enhanced with standardized loading/error/empty states and optimistic updates
 */

import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { EmptyState, ErrorState, CartItemSkeleton } from '../shared';
import { APIError, type ApiError } from '../../services/apiClient';
import { checkout, type CheckoutResult } from '../../services/cartService';

export const Cart: React.FC<{
  /** TECS-FBW-014: optional callback for App-level ORDER_CONFIRMED transition.
   * When provided, checkout success is propagated to the caller instead of
   * rendering the in-cart local confirmation. Falls back to local confirmation
   * if omitted (preserves backward compatibility). */
  onCheckoutSuccess?: (result: CheckoutResult) => void;
}> = ({ onCheckoutSuccess }) => {
  const { cart, loading, error, itemCount, subtotal, updateQuantity, removeItem, refreshCart } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<CheckoutResult | null>(null);

  const handleQuantityChange = async (
    itemId: string,
    newQuantity: number,
    _currentQuantity: number
  ) => {
    if (newQuantity < 0) return;

    // Optimistic update with rollback on failure
    setUpdatingItems(prev => new Set(prev).add(itemId));
    setErrorMessage(null);

    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);

      // Show user-friendly error
      if (err instanceof APIError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update quantity. Please try again.');
      }

      // Context will handle rollback via refreshCart
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    setErrorMessage(null);

    try {
      await removeItem(itemId);
    } catch (err) {
      console.error('Failed to remove item:', err);

      if (err instanceof APIError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to remove item. Please try again.');
      }
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  /** G-W3-ROUTING-001: Wire checkout to POST /api/tenant/checkout */
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setErrorMessage(null);
    try {
      const result = await checkout();
      if (onCheckoutSuccess) {
        // App-level handling: parent transitions to ORDER_CONFIRMED state.
        onCheckoutSuccess(result);
      } else {
        // In-cart fallback: show local confirmation panel.
        setOrderConfirmation(result);
      }
      // Refresh cart so it reflects the CHECKED_OUT status (cart will be empty/null)
      await refreshCart();
    } catch (err) {
      if (err instanceof APIError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Checkout failed. Please try again.');
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Loading state with skeleton
  if (loading && !cart) {
    return (
      <div className="space-y-4 p-4">
        <CartItemSkeleton />
        <CartItemSkeleton />
        <CartItemSkeleton />
      </div>
    );
  }

  // Error state
  if (error && !cart) {
    const apiError: ApiError =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as ApiError)
        : { status: 0, message: String(error) };

    return <ErrorState error={apiError} onRetry={() => window.location.reload()} />;
  }

  // Order confirmation state (shown after successful checkout)
  if (orderConfirmation) {
    return (
      <div className="space-y-6 p-4 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-5xl">✅</div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Order Placed!</h3>
          <p className="text-sm text-slate-500">
            Order <span className="font-mono font-bold text-slate-700">{orderConfirmation.orderId.slice(0, 8)}…</span> is{' '}
            <span className="capitalize">{orderConfirmation.status.toLowerCase().replace('_', ' ')}</span>.
          </p>
          <p className="text-lg font-bold text-indigo-600">
            Total: {orderConfirmation.currency} {orderConfirmation.totals.grandTotal.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">{orderConfirmation.itemCount} item(s) ordered</p>
        </div>
        <button
          onClick={() => setOrderConfirmation(null)}
          className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition"
        >
          Done
        </button>
      </div>
    );
  }

  // Empty state
  if (!cart || cart.items.length === 0) {
    return <EmptyState icon="🛒" title="Your cart is empty" message="Add items to get started" />;
  }

  // Data state
  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-2 underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shopping Cart</h2>
        <div className="text-sm text-slate-500">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="space-y-4">
        {cart.items.map(item => {
          const isUpdating = updatingItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center transition-opacity ${
                isUpdating ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{item.catalogItem.name}</h3>
                <p className="text-xs text-slate-500">SKU: {item.catalogItem.sku}</p>
                <p className="text-sm font-bold text-slate-700 mt-1">
                  ${item.catalogItem.price.toFixed(2)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1, item.quantity)}
                  disabled={isUpdating || item.quantity <= 1}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
                >
                  −
                </button>
                <div className="w-12 text-center font-bold">{item.quantity}</div>
                <button
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.quantity)}
                  disabled={isUpdating}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-right w-24">
                <div className="font-bold text-slate-900">
                  ${(item.catalogItem.price * item.quantity).toFixed(2)}
                </div>
              </div>

              <button
                onClick={() => handleRemove(item.id)}
                disabled={isUpdating}
                className="text-rose-600 hover:text-rose-700 text-sm font-bold disabled:opacity-30 transition-colors"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Shipping and taxes calculated at checkout</p>
      </div>

      <button
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleCheckout}
        disabled={checkoutLoading || updatingItems.size > 0}
      >
        {checkoutLoading ? 'Processing…' : 'Proceed to Checkout'}
      </button>
    </div>
  );
};
