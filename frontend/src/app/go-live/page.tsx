'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function GoLivePage() {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/auth/login'); return; }
    api.myChannels().then((list) => {
      setChannels(list);
      if (list[0]) setChannelId(list[0].id);
    }).catch(() => {});
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !channelId) return;
    setLoading(true);
    setError('');
    try {
      const s = await api.createLive({
        title: title.trim(),
        description: description || undefined,
        channelId,
      });
      setStream(s);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    if (!stream) return;
    try {
      await api.endLive(stream.id);
      setStream({ ...stream, status: 'ENDED' });
    } catch (err: any) {
      alert(err.message);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Начать эфир</h1>
      {!stream ? (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Название эфира</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Live stream title" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Канал</label>
            {channels.length > 0 ? (
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm">
                {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-zinc-500">Сначала <a href="/upload" className="text-brand-500">создай канал</a></p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading || !channelId}
            className="w-full rounded-full bg-red-600 py-3 font-medium text-white hover:bg-red-500 disabled:opacity-50 transition">
            {loading ? 'Создание...' : '● Создать эфир'}
          </button>
        </form>
      ) : (
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{stream.title}</h2>
              <p className="text-sm text-zinc-400">Статус: <span className={stream.status === 'LIVE' ? 'text-red-400' : 'text-zinc-300'}>{stream.status}</span></p>
            </div>
            {stream.status !== 'ENDED' && (
              <button onClick={handleEnd} className="rounded-full border border-red-800 px-4 py-1.5 text-sm text-red-400 hover:bg-red-950">Завершить</button>
            )}
          </div>
          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3 text-sm">
            <p className="text-zinc-400">Настройки для OBS / Streamlabs:</p>
            <div>
              <span className="text-zinc-500">Сервер (RTMP):</span>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 break-all rounded bg-zinc-900 px-3 py-2 text-xs">{stream.ingest?.rtmpUrl}</code>
                <button onClick={() => copy(stream.ingest?.rtmpUrl, 'rtmp')} className="rounded bg-zinc-800 px-3 text-xs hover:bg-zinc-700">{copied === 'rtmp' ? '✓' : 'Copy'}</button>
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Stream Key:</span>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 break-all rounded bg-zinc-900 px-3 py-2 text-xs font-mono">{stream.ingest?.streamKey}</code>
                <button onClick={() => copy(stream.ingest?.streamKey, 'key')} className="rounded bg-zinc-800 px-3 text-xs hover:bg-zinc-700">{copied === 'key' ? '✓' : 'Copy'}</button>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            1. OBS → Settings → Stream → Custom<br />
            2. Server + Stream Key<br />
            3. Start Streaming → статус LIVE<br />
            4. Зрители: <a href={`/live/${stream.id}`} className="text-brand-500 hover:underline">/live/{stream.id}</a>
          </p>
          <a href={`/live/${stream.id}`} className="inline-block rounded-full bg-brand-600 px-5 py-2 text-sm text-white hover:bg-brand-500">Открыть страницу эфира</a>
        </div>
      )}
    </div>
  );
}
