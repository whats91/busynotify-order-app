// =====================================================
// CART STORE - Zustand Store for Shopping Cart State
// =====================================================

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, CartItem } from '../../types';

interface CartItemWithTax extends CartItem {
  taxRate: number;
}

interface CartState {
  items: CartItemWithTax[];
  customerId?: string;
  customerName?: string;
  
  // Computed values
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  
  // Actions
  addItem: (product: Product, quantity: number, taxRate?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  resetCart: () => void;
  setCustomer: (customerId: string, customerName: string) => void;
  clearCustomer: () => void;
}

interface PersistedCartState {
  items?: CartItemWithTax[];
  customerId?: string;
  customerName?: string;
}

function calculateTotals(items: CartItemWithTax[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  // Calculate tax based on each item's tax rate
  const tax = items.reduce((sum, item) => sum + (item.totalPrice * item.taxRate / 100), 0);
  const total = subtotal + tax;
  return { totalItems, subtotal, tax, total };
}

function normalizePersistedItems(items: PersistedCartState['items']): CartItemWithTax[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.reduce<CartItemWithTax[]>((normalizedItems, item) => {
    if (!item?.product) {
      return normalizedItems;
    }

    const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const unitPrice =
      typeof item.unitPrice === 'number' && item.unitPrice >= 0
        ? item.unitPrice
        : item.product.price;
    const taxRate = typeof item.taxRate === 'number' && item.taxRate >= 0 ? item.taxRate : 18;

    normalizedItems.push({
      ...item,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      taxRate,
    });

    return normalizedItems;
  }, []);
}

function hydrateCartState(persistedState?: PersistedCartState): PersistedCartState & ReturnType<typeof calculateTotals> {
  const items = normalizePersistedItems(persistedState?.items);

  return {
    items,
    customerId: persistedState?.customerId,
    customerName: persistedState?.customerName,
    ...calculateTotals(items),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: undefined,
      customerName: undefined,
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      
      addItem: (product, quantity, taxRate = 18) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (item) => item.product.id === product.id
        );
        
        let newItems: CartItemWithTax[];
        
        if (existingIndex >= 0) {
          // Update existing item
          newItems = items.map((item, index) => {
            if (index === existingIndex) {
              const newQuantity = item.quantity + quantity;
              return {
                ...item,
                quantity: newQuantity,
                totalPrice: item.unitPrice * newQuantity,
              };
            }
            return item;
          });
        } else {
          // Add new item
          const newItem: CartItemWithTax = {
            id: `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            product,
            quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
            taxRate,
          };
          newItems = [...items, newItem];
        }
        
        const totals = calculateTotals(newItems);
        set({ items: newItems, ...totals });
      },
      
      removeItem: (itemId) => {
        const newItems = get().items.filter((item) => item.id !== itemId);
        const totals = calculateTotals(newItems);
        set({ items: newItems, ...totals });
      },
      
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        
        const newItems = get().items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity,
              totalPrice: item.unitPrice * quantity,
            };
          }
          return item;
        });
        
        const totals = calculateTotals(newItems);
        set({ items: newItems, ...totals });
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

      resetCart: () => {
        set({
          items: [],
          customerId: undefined,
          customerName: undefined,
          totalItems: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
        });
      },
      
      setCustomer: (customerId, customerName) => {
        set({ customerId, customerName });
      },
      
      clearCustomer: () => {
        set({ customerId: undefined, customerName: undefined });
      },
    }),
    {
      name: 'busy-notify-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        customerName: state.customerName,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...hydrateCartState(persistedState as PersistedCartState | undefined),
      }),
    }
  )
);

// Selector hooks
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemCount = () => useCartStore((state) => state.totalItems);
