/*
 * File Context:
 * Purpose: Stores shared client state for Pagination.Store.
 * Primary Functionality: Keeps client state synchronized across views, refreshes, and related interactions.
 * Interlinked With: Consumed by client components that need shared state.
 * Role: shared client state.
 */
// =====================================================
// PAGINATION STORE - Manage pagination state
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaginationState {
  // Per-page pagination settings
  pageSize: number;
  // Current page per route (keyed by route path)
  currentPages: Record<string, number>;
  // Actions
  setPageSize: (size: number) => void;
  setCurrentPage: (route: string, page: number) => void;
  getCurrentPage: (route: string) => number;
  resetPage: (route: string) => void;
}

export const usePaginationStore = create<PaginationState>()(
  persist(
    (set, get) => ({
      pageSize: 25, // Default 25 products per page
      currentPages: {},

      setPageSize: (size) => set({ pageSize: size }),

      setCurrentPage: (route, page) =>
        set((state) => ({
          currentPages: {
            ...state.currentPages,
            [route]: page,
          },
        })),

      getCurrentPage: (route) => {
        const state = get();
        return state.currentPages[route] || 1;
      },

      resetPage: (route) =>
        set((state) => {
          const { [route]: _, ...rest } = state.currentPages;
          return { currentPages: rest };
        }),
    }),
    {
      name: 'pagination-storage',
      partialize: (state) => ({
        pageSize: state.pageSize,
        currentPages: state.currentPages,
      }),
    }
  )
);
