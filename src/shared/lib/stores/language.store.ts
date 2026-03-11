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
