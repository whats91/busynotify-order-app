/*
 * File Context:
 * Purpose: Stores shared client state for Language.Store.
 * Primary Functionality: Keeps client state synchronized across views, refreshes, and related interactions.
 * Interlinked With: src/shared/translations/index.ts
 * Role: shared client state.
 */
// =====================================================
// LANGUAGE STORE - Zustand Store for Language State
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../../translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'busy-notify-language',
    }
  )
);
