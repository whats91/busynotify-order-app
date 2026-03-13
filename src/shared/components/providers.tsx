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

import React, { ReactNode, useEffect } from 'react';
import { AppConfigProvider } from '../lib/app-config-context';
import { LanguageProvider } from '../lib/language-context';
import { THEME_ASSETS_UPDATED_EVENT } from '../lib/theme-asset-events';

interface ProvidersProps {
  children: ReactNode;
  appName: string;
  appTitle: string;
}

export function Providers({ children, appName, appTitle }: ProvidersProps) {
  useEffect(() => {
    const updateThemeIcons = () => {
      const href = `/theme/icon?v=${Date.now()}`;
      const relValues = ['icon', 'shortcut icon', 'apple-touch-icon'];

      relValues.forEach((rel) => {
        let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }

        link.href = href;
      });
    };

    updateThemeIcons();
    window.addEventListener(THEME_ASSETS_UPDATED_EVENT, updateThemeIcons);

    return () => {
      window.removeEventListener(THEME_ASSETS_UPDATED_EVENT, updateThemeIcons);
    };
  }, []);

  return (
    <AppConfigProvider value={{ appName, appTitle }}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AppConfigProvider>
  );
}
