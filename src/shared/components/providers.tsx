/*
 * File Context:
 * Purpose: Provides the shared Providers component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/shared/lib/language-context.tsx
 * Role: shared UI.
 */
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
