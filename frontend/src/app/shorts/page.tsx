'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api, getToken } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';

export default function ShortsPage() {
  const [shorts, setShorts] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listShorts(30)
      .then(async (list) => {
        setShorts(list);
        if (getToken() && list.length > 0) {
          const map: Record<string, boolean> = {};
          for (const s of list.slice(0, 5)) {
            try {
              const r = await api.isLiked(s.id);
              map[s.id] = r.liked;
            } catch {}
          }
          setLiked(map);
        }
      })
      .catch(() => setShorts([]))
      .finally(() => setLoading(false));
  }, []);

  const current = shorts[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, shorts.length - 1));
  }, [shorts.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'j') goNext();
      if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lock = false;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (lock) return;
      lock = true;
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
      setTimeout(() => { lock = false; }, 400);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev]);

  async function handleLike() {
    if (!current || !getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    try {
      const res = await api.toggleLike(current.id);
      setLiked((m) => ({ ...m, [current.id]: res.liked }));
      setShorts((list) =>
        list.map((s) =>
          s.id === current.id
            ? { ...s, likesCount: (s.likesCount || 0) + (res.liked ? 1 : -1) }
            : s,
        ),
      );
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-zinc-500">
        Загрузка Shorts...
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4">
        <p className="text-zinc-500">Пока нет Shorts</p>
        <a href="/upload" className="rounded-full bg-brand-600 px-6 py-2.5 text-sm text-white hover:bg-brand-500">
          Загрузить Short
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative mx-auto flex h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center">
      <div className="relative w-full aspect-[9/16] max-h-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
        {current?.id ? <ShortPlayer video={current} /> : (
          <div className="flex h-full items-center justify-center text-zinc-600">▶</div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <a href={`/channel/${current?.channel?.slug}`} className="flex items-center gap-2 text-sm font-medium">
            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
              {current?.channel?.name?.[0]?.toUpperCase()}
            </div>
            {current?.channel?.name}
            {current?.channel?.isVerified && <span className="text-brand-500">✓</span>}
          </a>
          <p className="mt-1 text-sm line-clamp-2">{current?.title}</p>
        </div>

        <div className="absolute right-3 bottom-24 flex flex-col gap-4 items-center">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <span className={`text-2xl ${liked[current?.id] ? 'text-red-500' : 'text-white'}`}>
              {liked[current?.id] ? '♥' : '♡'}
            </span>
            <span className="text-xs text-white/80">{current?.likesCount || 0}</span>
          </button>
          <a href={`/watch/${current?.id}`} className="flex flex-col items-center gap-1 text-white">
            <span className="text-xl">💬</span>
            <span className="text-xs text-white/80">{current?.commentsCount || 0}</span>
          </a>
          <div className="text-xs text-white/60 mt-2">{index + 1}/{shorts.length}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-600">↑↓ / scroll — листать · J/K</p>
    </div>
  );
}

function ShortPlayer({ video }: { video: any }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const full = await api.getVideo(video.id);
        if (!cancelled && full.hlsUrl) setSrc(full.hlsUrl);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [video.id]);

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <VideoPlayer src={src} autoPlay />;
}
