/*
 * File Context:
 * Purpose: Defines the project file for Language Context.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/lib/stores/index.ts, src/shared/translations/index.ts, src/shared/types/index.ts
 * Role: shared project asset.
 */
// =====================================================
// LANGUAGE PROVIDER - React Context for Translations
// =====================================================

'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import type { TranslationSchema, Language } from '../types';
import { translations } from '../translations';
import { useLanguageStore } from './stores';

interface LanguageContextValue {
  language: Language;
  t: TranslationSchema;
  setLanguage: (lang: Language) => void;
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { language, setLanguage } = useLanguageStore();
  const t = translations[language];
  
  // Translate a dot-notation key like 'common.loading'
  const translate = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: unknown = t;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  }, [t]);
  
  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation(): TranslationSchema {
  const { t } = useLanguage();
  return t;
}

export function useT() {
  const { translate } = useLanguage();
  return translate;
}
