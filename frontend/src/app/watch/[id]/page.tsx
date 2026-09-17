'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, getUser } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const isLoggedIn = !!getToken();

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
      setLikesCount(data.likesCount || 0);

      if (getToken()) {
        try {
          const likeRes = await api.isLiked(id);
          setLiked(likeRes.liked);
        } catch {}
        if (data.channel?.id) {
          try {
            const subRes = await api.isSubscribed(data.channel.id);
            setSubscribed(subRes.subscribed);
          } catch {}
        }
      }

      try {
        const c = await api.listComments(id);
        setComments(c);
      } catch {
        setComments([]);
      }
    } catch (e: any) {
      setError(e.message || 'Видео не найдено');
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (!isLoggedIn) {
      window.location.href = '/auth/login';
      return;
    }
    try {
      const res = await api.toggleLike(id);
      setLiked(res.liked);
      setLikesCount((c) => (res.liked ? c + 1 : Math.max(0, c - 1)));
    } catch (e: any) {
      console.error(e);
    }
  }

  async function handleSubscribe() {
    if (!isLoggedIn || !video?.channel?.id) {
      window.location.href = '/auth/login';
      return;
    }
    try {
      const res = await api.toggleSubscribe(video.channel.id);
      setSubscribed(res.subscribed);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !isLoggedIn) return;
    setCommentLoading(true);
    try {
      const c = await api.createComment(id, commentText.trim());
      if (!c.isHidden) {
        setComments((prev) => [c, ...prev]);
      }
      setCommentText('');
      if (c.moderation?.status === 'REJECTED' || c.moderation?.status === 'QUARANTINED') {
        alert('Комментарий скрыт модерацией');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommentLoading(false);
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

      <div className="space-y-4">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">{video.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            {video.channel && (
              <div className="flex items-center gap-3">
                <a
                  href={`/channel/${video.channel.slug}`}
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium">
                    {video.channel.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-white">
                    {video.channel.name}
                    {video.channel.isVerified && (
                      <span className="ml-1 text-brand-500" title="Verified">✓</span>
                    )}
                  </span>
                </a>
                <button
                  onClick={handleSubscribe}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    subscribed
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {subscribed ? 'Подписан' : 'Подписаться'}
                </button>
              </div>
            )}

            <span>{video.views?.toLocaleString() || 0} просмотров</span>
            {video.duration != null && <span>{formatDuration(video.duration)}</span>}
            {video.publishedAt && (
              <span>{new Date(video.publishedAt).toLocaleDateString('ru')}</span>
            )}
          </div>

          <button
            onClick={handleLike}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              liked
                ? 'bg-brand-600/20 text-brand-400 border border-brand-600/40'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>{likesCount}</span>
          </button>
        </div>

        {video.description && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-sm text-zinc-300 whitespace-pre-wrap">
            {video.description}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-zinc-800 pt-6">
        <h2 className="text-lg font-semibold">
          Комментарии {video.commentsCount > 0 && `(${video.commentsCount})`}
        </h2>

        {isLoggedIn ? (
          <form onSubmit={handleComment} className="flex gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Написать комментарий..."
              className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={commentLoading || !commentText.trim()}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              Отправить
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-500">
            <a href="/auth/login" className="text-brand-500 hover:underline">
              Войдите
            </a>
            , чтобы комментировать
          </p>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-zinc-600">Пока нет комментариев</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs">
                  {(c.user?.displayName || c.user?.username)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {c.user?.displayName || c.user?.username}
                    </span>
                    {c.user?.isVerified && (
                      <span className="text-brand-500 text-xs">✓</span>
                    )}
                    <span className="text-zinc-600 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('ru')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-300">{c.text}</p>

                  {c.replies?.length > 0 && (
                    <div className="mt-3 ml-2 space-y-3 border-l border-zinc-800 pl-4">
                      {c.replies.map((r: any) => (
                        <div key={r.id} className="flex gap-2">
                          <div className="h-6 w-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[10px]">
                            {(r.user?.displayName || r.user?.username)?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">
                                {r.user?.displayName || r.user?.username}
                              </span>
                              <span className="text-zinc-600">
                                {new Date(r.createdAt).toLocaleDateString('ru')}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300">{r.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
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
