'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const KEY = 'sv_cookie_consent_v1';

type Prefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  async function save(p: Prefs) {
    localStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() }));
    setOpen(false);
    try {
      await api.recordConsent?.({
        analytics: p.analytics,
        marketing: p.marketing,
        preferences: p.preferences,
        region: navigator.language?.slice(0, 2).toUpperCase(),
      });
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-950/95 backdrop-blur shadow-2xl p-4 space-y-3">
        <p className="text-sm text-zinc-200">
          Cookie для работы сайта (необходимые) и — только с согласия — аналитика/маркетинг.{' '}
          <Link href="/cookies" className="text-brand-400 underline">Cookie Policy</Link>,{' '}
          <Link href="/privacy" className="text-brand-400 underline">Privacy</Link>.
        </p>
        {showDetail && (
          <div className="space-y-2 text-xs text-zinc-400 border border-zinc-800 rounded-xl p-3">
            <label className="flex gap-2"><input type="checkbox" checked disabled /> Necessary</label>
            <label className="flex gap-2">
              <input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))} /> Analytics
            </label>
            <label className="flex gap-2">
              <input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))} /> Marketing
            </label>
            <label className="flex gap-2">
              <input type="checkbox" checked={prefs.preferences} onChange={(e) => setPrefs((p) => ({ ...p, preferences: e.target.checked }))} /> Preferences
            </label>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={() => setShowDetail((v) => !v)} className="text-xs text-zinc-400 px-3 py-1.5">Настроить</button>
          <button type="button" onClick={() => save({ necessary: true, analytics: false, marketing: false, preferences: false })} className="rounded-full border border-zinc-600 px-4 py-1.5 text-xs">Только необходимые</button>
          <button type="button" onClick={() => save(prefs)} className="rounded-full bg-zinc-100 text-zinc-900 px-4 py-1.5 text-xs font-medium">Сохранить</button>
          <button type="button" onClick={() => save({ necessary: true, analytics: true, marketing: true, preferences: true })} className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white">Принять все</button>
        </div>
      </div>
    </div>
  );
}
