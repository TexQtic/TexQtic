/**
 * TexQtic Cart Context
 *
 * Global cart state management with backend synchronization
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cart,
  getCart,
  addToCart as addToCartService,
  updateCartItem,
  removeCartItem as removeCartItemService,
  calculateSubtotal,
} from '../services/cartService';
import { isAuthenticated } from '../services/apiClient';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  addToCart: (catalogItemId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart on mount if authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      refreshCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated()) {
      setCart(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedCart = await getCart();
      setCart(fetchedCart);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
      console.error('Cart load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(
    async (catalogItemId: string, quantity: number) => {
      setLoading(true);
      setError(null);

      try {
        // Add to cart via API
        await addToCartService({ catalogItemId, quantity });

        // Refresh cart to get updated state
        await refreshCart();
      } catch (err: any) {
        setError(err.message || 'Failed to add item to cart');
        console.error('Add to cart error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setLoading(true);
      setError(null);

      try {
        await updateCartItem(itemId, { quantity });
        await refreshCart();
      } catch (err: any) {
        setError(err.message || 'Failed to update quantity');
        console.error('Update quantity error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setLoading(true);
      setError(null);

      try {
        await removeCartItemService(itemId);
        await refreshCart();
      } catch (err: any) {
        setError(err.message || 'Failed to remove item');
        console.error('Remove item error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshCart]
  );

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = cart ? calculateSubtotal(cart) : 0;

  const contextValue = useMemo(
    () => ({
      cart,
      loading,
      error,
      itemCount,
      subtotal,
      addToCart,
      updateQuantity,
      removeItem,
      refreshCart,
    }),
    [cart, loading, error, itemCount, subtotal, addToCart, updateQuantity, removeItem, refreshCart]
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
