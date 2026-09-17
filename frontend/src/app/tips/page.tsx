'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function TipsDashboardPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<any>(null);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push('/auth/login');
      return;
    }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const [b, r, s] = await Promise.all([
        api.tipsBalance(),
        api.tipsReceived(),
        api.tipsSent(),
      ]);
      setBalance(b);
      setReceived(r);
      setSent(s);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Загрузка...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Донаты</h1>

      {balance && (
        <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6">
          <p className="text-sm text-zinc-400">Всего получено</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">${balance.totalFormatted}</p>
          <p className="text-xs text-zinc-500 mt-1">{balance.tipCount} донатов</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-zinc-800">
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'received' ? 'border-amber-500 text-white' : 'border-transparent text-zinc-400'
          }`}
        >
          Полученные
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'sent' ? 'border-amber-500 text-white' : 'border-transparent text-zinc-400'
          }`}
        >
          Отправленные
        </button>
      </div>

      <div className="space-y-2">
        {(tab === 'received' ? received : sent).length === 0 ? (
          <p className="text-center text-zinc-500 py-8">Пока пусто</p>
        ) : (
          (tab === 'received' ? received : sent).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {tab === 'received'
                    ? t.fromUser?.displayName || t.fromUser?.username
                    : t.toUser?.displayName || t.toUser?.username}
                </p>
                {t.message && <p className="text-xs text-zinc-400 line-clamp-1">{t.message}</p>}
                {t.video && (
                  <a href={`/watch/${t.video.id}`} className="text-xs text-brand-500 hover:underline">
                    {t.video.title}
                  </a>
                )}
                <p className="text-xs text-zinc-600 mt-0.5">
                  {new Date(t.createdAt).toLocaleString('ru')}
                </p>
              </div>
              <span className="text-amber-400 font-semibold flex-shrink-0">
                ${(t.amount / 100).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
