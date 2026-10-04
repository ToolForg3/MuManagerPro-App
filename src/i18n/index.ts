import { es } from './es';
import { en } from './en';
import { pt } from './pt';

export type LanguageCode = 'es' | 'en' | 'pt';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  flag: string;
  country: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'es', name: 'Español', flag: '🇦🇷', country: 'Argentina' },
  { code: 'en', name: 'English', flag: '🇺🇸', country: 'United States' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', country: 'Brasil' },
];

export const TRANSLATIONS = {
  es,
  en,
  pt,
};

export type TranslationKey = keyof typeof es;

export { es, en, pt };
