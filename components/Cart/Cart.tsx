/**
 * Cart Component
 *
 * Displays cart items with quantity controls and subtotal
 */

import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';

export const Cart: React.FC = () => {
  const { cart, loading, error, itemCount, subtotal, updateQuantity, removeItem } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);
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

    try {
      await removeItem(itemId);
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  if (loading && !cart) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-slate-500 mt-4">Loading cart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-4">🛒</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Your cart is empty</h3>
        <p className="text-slate-500">Add items to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              className={`bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center ${
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
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= 1}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                >
                  −
                </button>
                <div className="w-12 text-center font-bold">{item.quantity}</div>
                <button
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  disabled={isUpdating}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
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
                className="text-rose-600 hover:text-rose-700 text-sm font-bold disabled:opacity-30"
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
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition"
        onClick={() => console.log('Checkout not implemented (Wave 5)')}
      >
        Proceed to Checkout
      </button>
    </div>
  );
};
