'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, getUser } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<'stats' | 'moderation' | 'users' | 'logs'>('stats');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push('/auth/login');
      return;
    }
    const u = getUser();
    if (u && u.role !== 'ADMIN' && u.role !== 'MODERATOR') {
      setError('Нужна роль ADMIN или MODERATOR');
      setLoading(false);
      return;
    }
    loadStats();
  }, [router]);

  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      setStats(await api.adminStats());
    } catch (e: any) {
      setError(e.message || 'Нет доступа');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setUsers(await api.adminUsers());
      setTab('users');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadModeration() {
    try {
      setVideos(await api.adminModerationVideos());
      setTab('moderation');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadLogs() {
    try {
      setLogs(await api.adminLogs());
      setTab('logs');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function moderate(id: string, action: 'APPROVE' | 'REJECT' | 'QUARANTINE') {
    try {
      await api.adminModerateVideo(id, action);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function toggleVerify(id: string, current: boolean) {
    try {
      const u = await api.adminSetVerified(id, !current);
      setUsers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isVerified: u.isVerified } : x)),
      );
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function changeRole(id: string, role: string) {
    try {
      const u = await api.adminSetRole(id, role);
      setUsers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, role: u.role } : x)),
      );
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) return <div className="text-center py-20 text-zinc-500">Загрузка...</div>;

  if (error && !stats) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-zinc-500">
          Назначь роль:{" "}
          <code className="text-xs bg-zinc-800 px-1 rounded">
            UPDATE users SET role=&apos;ADMIN&apos; WHERE email=&apos;...&apos;
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: 'stats', label: 'Stats', fn: () => { setTab('stats'); loadStats(); } },
          { id: 'moderation', label: 'Модерация', fn: loadModeration },
          { id: 'users', label: 'Users', fn: loadUsers },
          { id: 'logs', label: 'Logs', fn: loadLogs },
        ].map((t) => (
          <button
            key={t.id}
            onClick={t.fn}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Users', stats.users],
            ['Videos', stats.videos],
            ['Channels', stats.channels],
            ['Comments', stats.comments],
            ['Live now', stats.liveNow],
            ['Pending mod', stats.pendingModeration],
            ['Quarantined', stats.quarantined],
            ['Tips $', ((stats.tipsTotalCents || 0) / 100).toFixed(0)],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-2xl font-bold mt-1">{val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="space-y-3">
          {videos.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">Очередь пуста</p>
          ) : (
            videos.map((v) => (
              <div key={v.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-wrap gap-3 items-start justify-between">
                <div className="min-w-0 flex-1">
                  <a href={`/watch/${v.id}`} className="font-medium hover:text-brand-400">{v.title}</a>
                  <p className="text-xs text-zinc-500 mt-1">
                    {v.uploader?.username}{v.uploader?.isVerified && ' ✓'} · {v.moderationStatus}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => moderate(v.id, 'APPROVE')} className="rounded-lg bg-green-700/80 px-3 py-1.5 text-xs hover:bg-green-600">Approve</button>
                  <button onClick={() => moderate(v.id, 'QUARANTINE')} className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs hover:bg-amber-600">Quarantine</button>
                  <button onClick={() => moderate(v.id, 'REJECT')} className="rounded-lg bg-red-700/80 px-3 py-1.5 text-xs hover:bg-red-600">Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-medium">
                  {u.displayName || u.username}
                  {u.isVerified && <span className="text-brand-500 ml-1">✓</span>}
                </p>
                <p className="text-xs text-zinc-500">@{u.username} · {u.email} · {u.role}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => toggleVerify(u.id, u.isVerified)} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">
                  {u.isVerified ? 'Unverify' : 'Verify'}
                </button>
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs">
                  {['USER', 'CREATOR', 'MODERATOR', 'ADMIN'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2 text-sm">
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-400">
              <span className="text-zinc-200">{l.action}</span> · {l.targetType}
              {l.video && ` · ${l.video.title}`}
              {l.reason && ` — ${l.reason}`}
              <span className="text-xs text-zinc-600 ml-2">{new Date(l.createdAt).toLocaleString('ru')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
