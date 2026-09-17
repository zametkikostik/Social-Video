'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function HomePage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFeed(24)
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8 md:p-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Открытый <span className="text-brand-500">видео-хостинг</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Social-Video — современная платформа для VOD, Live и Shorts.
          Cloudflare R2, адаптивный HLS, AI-модерация и полная свобода.
          Лицензия GNU AGPLv3.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/upload"
            className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-500 transition"
          >
            Загрузить видео
          </a>
          <a
            href="https://github.com/zametkikostik/Social-Video"
            className="rounded-full border border-zinc-700 px-6 py-3 font-medium hover:bg-zinc-900 transition"
          >
            GitHub
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Рекомендации</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 animate-pulse">
                <div className="aspect-video bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">
            Пока нет видео. Будь первым —{' '}
            <a href="/upload" className="text-brand-500 hover:underline">
              загрузи
            </a>
            !
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((v) => (
              <a
                key={v.id}
                href={`/watch/${v.id}`}
                className="group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition"
              >
                <div className="aspect-video bg-zinc-800 relative flex items-center justify-center text-zinc-600 text-3xl">
                  ▶
                  {v.duration != null && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                      {formatDuration(v.duration)}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-brand-400 transition">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {v.channel?.name}
                    {v.channel?.isVerified && ' ✓'}
                    {v.views != null && ` · ${v.views} просм.`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">Cloudflare R2</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Zero egress fees. Идеально для видео-библиотеки любого размера.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">AI Moderator</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Авто-проверка токсичности. Verified-пользователи — без риска бана.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">Open Source</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Полный контроль. AGPLv3. Можно форкать и модифицировать.
          </p>
        </div>
      </section>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
