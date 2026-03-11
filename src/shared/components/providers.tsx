// =====================================================
// PROVIDERS - Client-side wrapper for all providers
// =====================================================

'use client';

import React, { ReactNode } from 'react';
import { LanguageProvider } from '../lib/language-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
