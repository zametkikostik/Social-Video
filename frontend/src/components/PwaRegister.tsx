'use client';

import { useEffect, useState } from 'react';

export default function PwaRegister() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] SW registered', reg.scope))
      .catch((err) => console.warn('[PWA] SW failed', err));

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferred(null);
  }

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur sm:bottom-4 sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg">▶</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Установить Social-Video</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Быстрый доступ с домашнего экрана, офлайн-оболочка
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
            >
              Установить
            </button>
            <button
              onClick={() => setShowInstall(false)}
              className="rounded-full px-4 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
