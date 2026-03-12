/*
 * File Context:
 * Purpose: Defines the project file for Index.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/translations/en.ts, src/shared/translations/hi.ts, src/shared/types/index.ts
 * Role: shared project asset.
 */
// =====================================================
// TRANSLATION INDEX
// =====================================================

import type { TranslationSchema } from '../types';
import { en } from './en';
import { hi } from './hi';

export type Language = 'en' | 'hi';

export const translations: Record<Language, TranslationSchema> = {
  en,
  hi,
};

export function getTranslation(lang: Language): TranslationSchema {
  return translations[lang] || translations.en;
}

export { en, hi };
