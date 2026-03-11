// =====================================================
// CUSTOMER STORE - Persisted customer login context
// =====================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CustomerIdentity } from '../../types';

interface CustomerState {
  customerId: string | null;
  customerName: string | null;
  setCustomer: (customer: CustomerIdentity) => void;
  clearCustomer: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customerId: null,
      customerName: null,
      setCustomer: ({ customerId, customerName }) =>
        set({
          customerId,
          customerName,
        }),
      clearCustomer: () =>
        set({
          customerId: null,
          customerName: null,
        }),
    }),
    {
      name: 'busy-notify-customer',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customerId: state.customerId,
        customerName: state.customerName,
      }),
    }
  )
);

export const useLoggedInCustomer = () =>
  useCustomerStore((state) =>
    state.customerId && state.customerName
      ? {
          customerId: state.customerId,
          customerName: state.customerName,
        }
      : null
  );
