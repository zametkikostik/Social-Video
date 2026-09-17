'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LiveListPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLive(30).then(setStreams).catch(() => setStreams([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Прямые эфиры</h1>
        <a href="/go-live" className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500">● Начать эфир</a>
      </div>
      {loading ? (
        <p className="text-center text-zinc-500 py-12">Загрузка...</p>
      ) : streams.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">
          Сейчас никто не в эфире. <a href="/go-live" className="text-brand-500 hover:underline">Будь первым</a>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((s) => (
            <a key={s.id} href={`/live/${s.id}`} className="group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-red-800 transition">
              <div className="aspect-video bg-zinc-800 relative flex items-center justify-center">
                <span className="absolute top-2 left-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">LIVE</span>
                <span className="text-4xl text-zinc-600">📡</span>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-400">{s.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {s.channel?.name}{s.channel?.isVerified && ' ✓'}
                  {s.viewers > 0 && ` · ${s.viewers} зрителей`}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
