// =====================================================
// AUTH STORE - Zustand Store for Authentication State
// =====================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Role, AuthSession } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: AuthSession) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      // Default to true on server, false on client (will be set to true after hydration)
      _hasHydrated: !isClient,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      setSession: (session) => set({ 
        user: session.user, 
        token: session.token,
        isAuthenticated: true,
        error: null,
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      logout: () => set({ 
        user: null, 
        token: null,
        isAuthenticated: false,
        error: null,
      }),
      
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'busy-notify-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Use onRehydrateStorage to set hydration flag after rehydration
      // The returned function is called AFTER rehydration completes
      onRehydrateStorage: () => {
        // Return a function that will be called after rehydration
        return function onRehydrate() {
          // Use queueMicrotask to ensure the store is fully initialized
          // before we try to access it
          queueMicrotask(() => {
            useAuthStore.getState().setHasHydrated(true);
          });
        };
      },
    }
  )
);

// Selector hooks
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserRole = (): Role | null => useAuthStore((state) => state.user?.role || null);
export const useHasHydrated = () => useAuthStore((state) => state._hasHydrated);
