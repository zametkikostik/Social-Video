'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getVideo(id);
      setVideo(data);
    } catch (e: any) {
      setError(e.message || 'Видео не найдено');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Загрузка...
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error || 'Видео не найдено'}</p>
        <a href="/" className="mt-4 inline-block text-brand-500 hover:underline">
          На главную
        </a>
      </div>
    );
  }

  const isReady = video.status === 'READY' && video.hlsUrl;
  const isProcessing = video.status === 'PROCESSING' || video.status === 'UPLOADING';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {isReady ? (
        <VideoPlayer src={video.hlsUrl} poster={video.thumbnailUrl} />
      ) : (
        <div className="aspect-video rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3">
          {isProcessing ? (
            <>
              <div className="h-10 w-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400">Видео обрабатывается...</p>
              <p className="text-xs text-zinc-600">Статус: {video.status}</p>
            </>
          ) : (
            <p className="text-zinc-500">Видео недоступно ({video.status})</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">{video.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          {video.channel && (
            <a
              href={`/channel/${video.channel.slug}`}
              className="flex items-center gap-2 hover:text-white transition"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                {video.channel.name?.[0]?.toUpperCase()}
              </div>
              <span className="font-medium text-white">
                {video.channel.name}
                {video.channel.isVerified && (
                  <span className="ml-1 text-brand-500" title="Verified">✓</span>
                )}
              </span>
            </a>
          )}

          <span>{video.views?.toLocaleString() || 0} просмотров</span>

          {video.duration != null && <span>{formatDuration(video.duration)}</span>}

          {video.publishedAt && (
            <span>{new Date(video.publishedAt).toLocaleDateString('ru')}</span>
          )}
        </div>

        {video.description && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-sm text-zinc-300 whitespace-pre-wrap">
            {video.description}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          {video.isShort && (
            <span className="rounded-full bg-pink-900/50 text-pink-300 px-3 py-1">Short</span>
          )}
          {video.moderationStatus && (
            <span className="rounded-full bg-zinc-800 text-zinc-400 px-3 py-1">
              {video.moderationStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
