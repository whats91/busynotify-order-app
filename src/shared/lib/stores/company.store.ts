// =====================================================
// COMPANY STORE - Zustand Store for Company Selection
// =====================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Company } from '../../types';

interface CompanyState {
  selectedCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  isProductsLoading: boolean; // Separate loading state for products fetch
  error: string | null;
  _hasHydrated: boolean;
  
  // Actions
  setSelectedCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
  setLoading: (loading: boolean) => void;
  setProductsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCompany: () => void;
  setHasHydrated: (state: boolean) => void;
}

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompany: null,
      companies: [],
      isLoading: false,
      isProductsLoading: false,
      error: null,
      // Default to true on server, false on client (will be set to true after hydration)
      _hasHydrated: !isClient,
      
      setSelectedCompany: (selectedCompany) => set({ selectedCompany }),
      
      setCompanies: (companies) => set({ companies }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setProductsLoading: (isProductsLoading) => set({ isProductsLoading }),
      
      setError: (error) => set({ error }),
      
      clearCompany: () => set({ 
        selectedCompany: null,
        companies: [],
        error: null,
      }),
      
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'busy-notify-company',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedCompany: state.selectedCompany,
        companies: state.companies,
      }),
      onRehydrateStorage: () => {
        return function onRehydrate() {
          queueMicrotask(() => {
            useCompanyStore.getState().setHasHydrated(true);
          });
        };
      },
    }
  )
);

// Selector hooks
export const useSelectedCompany = () => useCompanyStore((state) => state.selectedCompany);
export const useCompanies = () => useCompanyStore((state) => state.companies);
export const useCompanyHasHydrated = () => useCompanyStore((state) => state._hasHydrated);
