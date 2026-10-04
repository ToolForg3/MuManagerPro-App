import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LANGUAGES,
  TRANSLATIONS,
  LanguageCode,
  LanguageInfo,
  TranslationKey,
} from '../i18n';

export { LANGUAGES, LanguageCode, LanguageInfo, TranslationKey, TRANSLATIONS };

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (
    key: TranslationKey | string,
    fallbackOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ) => string;
  currentFlag: string;
}

const formatTranslation = (template: string, params?: Record<string, any>): string => {
  if (!params) return template;
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return result;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key, fallbackOrParams, params) => {
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
    const actualParams = typeof fallbackOrParams === 'object' ? fallbackOrParams : params;
    const raw = (TRANSLATIONS.es as any)[key] || fallback || key;
    return formatTranslation(raw, actualParams);
  },
  currentFlag: '🇦🇷',
});

const LANG_STORAGE_KEY = '@mumanager_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<LanguageCode>('es');

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'es' || saved === 'en' || saved === 'pt')) {
        setLangState(saved);
      }
    });
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLangState(lang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const t = (
    key: TranslationKey | string,
    fallbackOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => {
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
    const actualParams = typeof fallbackOrParams === 'object' ? fallbackOrParams : params;

    const dict = TRANSLATIONS[language] as any;
    const esDict = TRANSLATIONS.es as any;

    const raw = dict?.[key] || esDict?.[key] || fallback || key;
    return formatTranslation(raw, actualParams);
  };

  const currentFlag = LANGUAGES.find((l) => l.code === language)?.flag || '🇦🇷';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentFlag }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
