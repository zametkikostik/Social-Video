'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/auth/login'); return; }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      setPlaylists(await api.myPlaylists());
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const pl = await api.createPlaylist({ title: title.trim() });
      setPlaylists((prev) => [pl, ...prev]);
      setTitle('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить плейлист?')) return;
    try {
      await api.deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Мои плейлисты</h1>
      <form onSubmit={handleCreate} className="flex gap-3">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Название нового плейлиста"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
        <button type="submit" disabled={creating || !title.trim()}
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition">
          Создать
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <p className="text-zinc-500 text-center py-8">Загрузка...</p>
      ) : playlists.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">Пока нет плейлистов. Создай первый!</p>
      ) : (
        <div className="space-y-2">
          {playlists.map((pl) => (
            <div key={pl.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600 transition">
              <a href={`/playlist/${pl.id}`} className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{pl.title}</h3>
                <p className="text-xs text-zinc-500">{pl._count?.items ?? 0} видео{!pl.isPublic && ' · Приватный'}</p>
              </a>
              <button onClick={() => handleDelete(pl.id)} className="text-xs text-zinc-500 hover:text-red-400 px-2">Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
