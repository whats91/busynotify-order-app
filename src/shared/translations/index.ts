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
