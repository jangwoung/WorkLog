'use client';

import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { messages, type Locale } from '@/app/i18n/messages';

const STORAGE_KEY = 'worklog-locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ja') return stored;
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = messages[locale];
      return dict[key] ?? messages.en[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      <SetHtmlLang />
      {children}
    </LanguageContext.Provider>
  );
}

function SetHtmlLang() {
  const { locale } = useContext(LanguageContext)!;
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'ja' ? 'ja' : 'en';
    }
  }, [locale]);
  return null;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
