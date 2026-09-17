'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
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
      const list = await api.listNotifications();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAll() {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  async function markOne(id: string) {
    try {
      await api.markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {}
  }

  const typeIcon: Record<string, string> = {
    LIKE: '♥',
    COMMENT: '💬',
    REPLY: '↩',
    SUBSCRIBE: '🔔',
    LIVE: '📡',
    VIDEO_READY: '✓',
    SYSTEM: 'ℹ',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        {items.some((n) => !n.isRead) && (
          <button onClick={markAll} className="text-sm text-brand-500 hover:underline">
            Прочитать все
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-zinc-500 py-12">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">Пока нет уведомлений</p>
      ) : (
        <div className="space-y-1">
          {items.map((n) => (
            <a
              key={n.id}
              href={n.link || '#'}
              onClick={() => { if (!n.isRead) markOne(n.id); }}
              className={`flex gap-3 rounded-xl border px-4 py-3 transition ${
                n.isRead
                  ? 'border-zinc-800 bg-zinc-900/30'
                  : 'border-brand-900/50 bg-brand-950/20'
              } hover:border-zinc-600`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[n.type] || '•'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />}
                </div>
                {n.body && <p className="text-sm text-zinc-400 line-clamp-2 mt-0.5">{n.body}</p>}
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600">
                  {n.actor && (
                    <span>{n.actor.displayName || n.actor.username}{n.actor.isVerified && ' ✓'}</span>
                  )}
                  <span>{new Date(n.createdAt).toLocaleString('ru')}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
