'use client';

import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';

export default function HypeButton({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getHype?.(videoId).then((r: any) => setScore(r.score || 0)).catch(() => {});
    api.hypePacks?.().then(setPacks).catch(() => {});
  }, [videoId]);

  async function buy(packId: string) {
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    setLoading(true);
    try {
      const r = await api.createHype(videoId, packId);
      setScore(r.score || score);
      setMsg('Hype активирован!');
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) {
      setMsg(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-fuchsia-500/40 bg-fuchsia-950/30 px-4 py-2 text-sm text-fuchsia-300">
        🔥 Hype{score > 0 ? ` · ${score}` : ''}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">Хайпнуть видео</h3>
              <button onClick={() => setOpen(false)}>×</button>
            </div>
            <p className="text-xs text-zinc-500">Продвигает ролик в рекомендациях на время пакета.</p>
            {packs.map((p) => (
              <button key={p.id} disabled={loading} onClick={() => buy(p.id)} className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-left hover:border-fuchsia-500/50">
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-zinc-500 ml-2">{p.hours}h · {p.amount} pts</span>
              </button>
            ))}
            {msg && <p className="text-sm text-fuchsia-300">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
