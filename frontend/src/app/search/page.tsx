'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') || '';

  const [q, setQ] = useState(initialQ);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  async function doSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const results = await api.searchVideos(query.trim());
      setVideos(results);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    doSearch(q);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Поиск</h1>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Название, описание, канал..."
          className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm focus:border-brand-500 focus:outline-none"
          autoFocus
        />
        <button type="submit" className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-500 transition">
          Найти
        </button>
      </form>
      {loading && <p className="text-zinc-500 text-center py-8">Ищем...</p>}
      {!loading && searched && videos.length === 0 && (
        <p className="text-zinc-500 text-center py-8">Ничего не найдено по запросу «{initialQ || q}»</p>
      )}
      {!loading && videos.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{videos.length} результатов</p>
          {videos.map((v) => (
            <a key={v.id} href={`/watch/${v.id}`} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-600 transition">
              <div className="w-40 aspect-video flex-shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 text-2xl">▶</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium line-clamp-2">{v.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {v.channel?.name}{v.channel?.isVerified && ' ✓'}
                  {v.views != null && ` · ${v.views} просм.`}
                </p>
                {v.description && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{v.description}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Загрузка...</div>}>
      <SearchContent />
    </Suspense>
  );
}
