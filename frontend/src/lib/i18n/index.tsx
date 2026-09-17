'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LOCALES, LOCALE_LABELS, LocaleCode, messages } from './locales';

type I18nCtx = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, fallback?: string) => string;
  locales: LocaleCode[];
  labels: Record<LocaleCode, string>;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = 'sv_locale';

function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
  if (saved && LOCALES.includes(saved)) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('pt')) return 'pt-BR';
  const short = nav.slice(0, 2);
  const hit = LOCALES.find((l) => l === short || l.startsWith(short));
  return hit || 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');
  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);
  const setLocale = useCallback((l: LocaleCode) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l === 'pt-BR' ? 'pt' : l;
    }
  }, []);
  const t = useCallback(
    (key: string, fallback?: string) =>
      messages[locale]?.[key] || messages.en[key] || fallback || key,
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t, locales: LOCALES, labels: LOCALE_LABELS }),
    [locale, setLocale, t],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

export function useT() {
  return useI18n().t;
}
