'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, getUser } from '@/lib/api';

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [tab, setTab] = useState<'videos' | 'community'>('videos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  const user = getUser();
  const isOwner = user && channel && user.id === channel.ownerId;

  useEffect(() => {
    if (!slug) return;
    load();
  }, [slug]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const ch = await api.getChannel(slug);
      setChannel(ch);
      const [vids, community] = await Promise.all([
        api.getChannelVideos(slug).catch(() => []),
        api.getCommunityBySlug(slug).catch(() => []),
      ]);
      setVideos(vids);
      setPosts(community);
      if (getToken() && ch.id) {
        try {
          const s = await api.isSubscribed(ch.id);
          setSubscribed(s.subscribed);
        } catch {}
      }
    } catch (e: any) {
      setError(e.message || 'Канал не найден');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!getToken() || !channel) {
      window.location.href = '/auth/login';
      return;
    }
    try {
      const r = await api.toggleSubscribe(channel.id);
      setSubscribed(r.subscribed);
    } catch {}
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postText.trim() || !channel) return;
    setPosting(true);
    try {
      const p = await api.createCommunityPost(channel.id, { text: postText.trim() });
      setPosts((prev) => [p, ...prev]);
      setPostText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Удалить пост?')) return;
    try {
      await api.deleteCommunityPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="text-center py-20 text-zinc-500">Загрузка...</div>;
  if (error || !channel) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <a href="/" className="mt-4 inline-block text-brand-500 hover:underline">На главную</a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="h-32 md:h-40 bg-gradient-to-r from-zinc-800 to-zinc-900" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <div className="h-20 w-20 rounded-full bg-zinc-700 border-4 border-zinc-950 flex items-center justify-center text-2xl font-bold">
              {channel.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">
                {channel.name}
                {channel.isVerified && <span className="ml-2 text-brand-500">✓</span>}
              </h1>
              <p className="text-sm text-zinc-400">
                @{channel.slug}
                {channel._count?.subscribers != null && ` · ${channel._count.subscribers} подписчиков`}
                {channel._count?.videos != null && ` · ${channel._count.videos} видео`}
              </p>
            </div>
            {!isOwner && (
              <button onClick={handleSubscribe}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  subscribed ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-black hover:bg-zinc-200'
                }`}>
                {subscribed ? 'Подписан' : 'Подписаться'}
              </button>
            )}
          </div>
          {channel.description && (
            <p className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        <button onClick={() => setTab('videos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'videos' ? 'border-brand-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}>Видео</button>
        <button onClick={() => setTab('community')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'community' ? 'border-brand-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}>Community</button>
      </div>

      {tab === 'videos' && (
        videos.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">Нет видео</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <a key={v.id} href={`/watch/${v.id}`}
                className="group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition">
                <div className="aspect-video bg-zinc-800 flex items-center justify-center text-zinc-600 text-2xl">▶</div>
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-brand-400">{v.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{v.views ?? 0} просм.{v.isShort && ' · Short'}</p>
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {tab === 'community' && (
        <div className="space-y-4 max-w-2xl">
          {isOwner && (
            <form onSubmit={handlePost} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={3}
                placeholder="Что нового на канале?"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none" />
              <button type="submit" disabled={posting || !postText.trim()}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
                Опубликовать
              </button>
            </form>
          )}
          {posts.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Пока нет постов</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                      {(p.author?.displayName || p.author?.username)?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {p.author?.displayName || p.author?.username}
                      {p.author?.isVerified && <span className="text-brand-500 ml-1">✓</span>}
                    </span>
                    <span className="text-zinc-600 text-xs">{new Date(p.createdAt).toLocaleDateString('ru')}</span>
                  </div>
                  {isOwner && (
                    <button onClick={() => handleDeletePost(p.id)} className="text-xs text-zinc-500 hover:text-red-400">Удалить</button>
                  )}
                </div>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{p.text}</p>
                {p.likesCount > 0 && <p className="text-xs text-zinc-500">♥ {p.likesCount}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
