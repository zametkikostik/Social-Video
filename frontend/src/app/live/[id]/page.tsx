'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import LiveChat from '@/components/LiveChat';

export default function LiveWatchPage() {
  const params = useParams();
  const id = params.id as string;

  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [id]);

  async function load() {
    try {
      const data = await api.getLive(id);
      setStream(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Эфир не найден');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Загрузка...</div>;
  }

  if (error || !stream) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <a href="/live" className="mt-4 inline-block text-brand-500 hover:underline">К эфирам</a>
      </div>
    );
  }

  const isLive = stream.status === 'LIVE';
  const hlsUrl = stream.hlsUrl || stream.playback?.hlsUrl;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          {isLive && hlsUrl ? (
            <VideoPlayer src={hlsUrl} autoPlay />
          ) : (
            <div className="aspect-video rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3">
              {stream.status === 'ENDED' ? (
                <p className="text-zinc-400">Эфир завершён</p>
              ) : (
                <>
                  <div className="h-10 w-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400">Ожидание трансляции...</p>
                  <p className="text-xs text-zinc-600">Статус: {stream.status}</p>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {isLive && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">LIVE</span>
              )}
              <h1 className="text-xl font-bold">{stream.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {stream.channel && (
                <a href={`/channel/${stream.channel.slug}`} className="flex items-center gap-2 hover:text-white">
                  <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                    {stream.channel.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-white">
                    {stream.channel.name}
                    {stream.channel.isVerified && <span className="ml-1 text-brand-500">✓</span>}
                  </span>
                </a>
              )}
              {stream.viewers > 0 && <span>{stream.viewers} зрителей</span>}
            </div>
            {stream.description && (
              <p className="text-sm text-zinc-300 rounded-xl bg-zinc-900 border border-zinc-800 p-4">{stream.description}</p>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-20">
          <LiveChat streamId={id} />
        </div>
      </div>
    </div>
  );
}
