// =====================================================
// ROOT PAGE - Redirects to appropriate dashboard
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';

// Maximum time to wait for hydration before forcing redirect
const HYDRATION_TIMEOUT = 3000;

export default function HomePage() {
  const { isAuthenticated, setHasHydrated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const [forceRedirect, setForceRedirect] = useState(false);
  
  useEffect(() => {
    // Safety timeout - force hydration after timeout
    const safetyTimer = setTimeout(() => {
      if (!hasHydrated) {
        console.warn('Hydration timeout - forcing redirect');
        setHasHydrated(true);
        setForceRedirect(true);
      }
    }, HYDRATION_TIMEOUT);
    
    return () => clearTimeout(safetyTimer);
  }, [hasHydrated, setHasHydrated]);
  
  useEffect(() => {
    // Wait for hydration before redirecting
    if (!hasHydrated && !forceRedirect) return;
    
    // Use window.location.href for full page reload to ensure
    // destination page reads fresh state from localStorage
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated, forceRedirect]);
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
