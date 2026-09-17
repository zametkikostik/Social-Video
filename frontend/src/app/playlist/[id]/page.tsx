'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id as string;
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setPlaylist(await api.getPlaylist(id));
    } catch (e: any) {
      setError(e.message || 'Плейлист не найден');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(videoId: string) {
    if (!confirm('Убрать видео из плейлиста?')) return;
    try {
      await api.removeFromPlaylist(id, videoId);
      setPlaylist((prev: any) => ({
        ...prev,
        items: prev.items.filter((i: any) => i.videoId !== videoId && i.video?.id !== videoId),
      }));
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) return <div className="text-center py-20 text-zinc-500">Загрузка...</div>;
  if (error || !playlist) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <a href="/playlists" className="mt-4 inline-block text-brand-500 hover:underline">К плейлистам</a>
      </div>
    );
  }

  const items = playlist.items || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-sm text-zinc-400">{playlist.description}</p>}
        <p className="mt-2 text-xs text-zinc-500">
          {playlist.owner?.displayName || playlist.owner?.username}
          {playlist.owner?.isVerified && ' ✓'} · {items.length} видео
          {!playlist.isPublic && ' · Приватный'}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">Плейлист пуст</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: any, idx: number) => {
            const v = item.video;
            if (!v) return null;
            return (
              <div key={item.id || v.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 hover:border-zinc-600 transition">
                <span className="w-6 text-center text-xs text-zinc-600">{idx + 1}</span>
                <a href={`/watch/${v.id}`} className="flex flex-1 gap-3 min-w-0 items-center">
                  <div className="w-28 aspect-video flex-shrink-0 rounded bg-zinc-800 flex items-center justify-center text-zinc-600">▶</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">{v.title}</h3>
                    <p className="text-xs text-zinc-500">{v.channel?.name}</p>
                  </div>
                </a>
                {getToken() && (
                  <button onClick={() => handleRemove(v.id)} className="text-xs text-zinc-500 hover:text-red-400 px-2">✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
