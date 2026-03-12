/*
 * File Context:
 * Purpose: Stores shared client state for Ecommerce Cart.Store.
 * Primary Functionality: Keeps client state synchronized across views, refreshes, and related interactions.
 * Interlinked With: src/shared/types/index.ts
 * Role: shared client state.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EcommerceCatalogProduct } from '../../types';

interface EcommerceCartItem {
  id: string;
  product: EcommerceCatalogProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface EcommerceCartContext {
  companyId: number | null;
  financialYear: string;
}

interface EcommerceCartState {
  context: EcommerceCartContext;
  items: EcommerceCartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  setContext: (companyId: number | null, financialYear: string) => void;
  addItem: (product: EcommerceCatalogProduct, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

function calculateTotals(items: EcommerceCartItem[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = items.reduce(
    (sum, item) => sum + (item.totalPrice * item.product.taxRate) / 100,
    0
  );

  return {
    totalItems,
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

export const useEcommerceCartStore = create<EcommerceCartState>()(
  persist(
    (set, get) => ({
      context: {
        companyId: null,
        financialYear: '',
      },
      items: [],
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      setContext: (companyId, financialYear) => {
        const current = get().context;
        const hasChanged =
          current.companyId !== companyId || current.financialYear !== financialYear;

        if (!hasChanged) {
          return;
        }

        set({
          context: {
            companyId,
            financialYear,
          },
          items: [],
          totalItems: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
        });
      },
      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingIndex = items.findIndex((item) => item.product.productId === product.productId);

        let nextItems: EcommerceCartItem[];

        if (existingIndex >= 0) {
          nextItems = items.map((item, index) => {
            if (index !== existingIndex) {
              return item;
            }

            const nextQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: nextQuantity,
              totalPrice: item.unitPrice * nextQuantity,
            };
          });
        } else {
          nextItems = [
            ...items,
            {
              id: `ecom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              product,
              quantity,
              unitPrice: product.price,
              totalPrice: product.price * quantity,
            },
          ];
        }

        set({
          items: nextItems,
          ...calculateTotals(nextItems),
        });
      },
      removeItem: (itemId) => {
        const nextItems = get().items.filter((item) => item.id !== itemId);
        set({
          items: nextItems,
          ...calculateTotals(nextItems),
        });
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const nextItems = get().items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity,
                totalPrice: item.unitPrice * quantity,
              }
            : item
        );

        set({
          items: nextItems,
          ...calculateTotals(nextItems),
        });
      },
      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
        });
      },
    }),
    {
      name: 'busy-notify-ecommerce-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        context: state.context,
        items: state.items,
      }),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<EcommerceCartState> | undefined;
        const items = Array.isArray(state?.items) ? state.items : [];

        return {
          ...currentState,
          context: state?.context || currentState.context,
          items,
          ...calculateTotals(items),
        };
      },
    }
  )
);
