'use client';

import { useI18n } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale, locales, labels, t } = useI18n();
  return (
    <label className="inline-flex items-center gap-1 text-xs text-zinc-400">
      <span className="hidden md:inline">{t('lang.label')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 max-w-[7.5rem]"
        aria-label={t('lang.label')}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {labels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
