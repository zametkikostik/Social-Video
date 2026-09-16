'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isShort, setIsShort] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'creating' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.push('/auth/login');
      return;
    }
    loadChannels();
  }, [router]);

  async function loadChannels() {
    try {
      const list = await api.myChannels();
      setChannels(list);
      if (list.length > 0) setChannelId(list[0].id);
    } catch {
      setChannels([]);
    }
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    try {
      const ch = await api.createChannel({ name: newChannelName.trim() });
      setChannels((prev) => [...prev, ch]);
      setChannelId(ch.id);
      setNewChannelName('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  }

  async function handleUpload() {
    if (!file || !title || !channelId) {
      setError('Заполни название, выбери файл и канал');
      return;
    }

    setError('');
    setStatus('uploading');
    setProgress(0);

    try {
      const { uploadUrl, key } = await api.getUploadUrl(file.name, file.type || 'video/mp4');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setStatus('creating');

      const video = await api.createVideo({
        title,
        description: description || undefined,
        channelId,
        originalKey: key,
        isShort,
      });

      setResult(video);
      setStatus('done');
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Загрузить видео</h1>

      {status === 'done' && result ? (
        <div className="rounded-xl border border-green-800 bg-green-950/40 p-6 space-y-3">
          <p className="text-green-400 font-medium">✓ Видео принято!</p>
          <p className="text-sm text-zinc-400">
            Модерация: <span className="text-white">{result.moderation?.status}</span>
            {result.moderation?.skippedBecauseVerified && ' (verified — soft pass)'}
          </p>
          {result.moderation?.labels?.length > 0 && (
            <p className="text-sm text-zinc-400">
              Labels: {result.moderation.labels.join(', ')}
            </p>
          )}
          <p className="text-sm text-zinc-400">
            Статус: {result.status}. Транскодинг запущен.
          </p>
          <div className="flex gap-3 pt-2">
            <a
              href={`/watch/${result.id}`}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm text-white hover:bg-brand-500"
            >
              Открыть видео
            </a>
            <button
              onClick={() => {
                setStatus('idle');
                setResult(null);
                setFile(null);
                setTitle('');
                setDescription('');
                setProgress(0);
              }}
              className="rounded-full border border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-900"
            >
              Загрузить ещё
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Файл</label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={onFileChange}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-brand-500"
            />
            {file && (
              <p className="mt-1 text-xs text-zinc-500">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Название видео"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
              placeholder="О чём видео..."
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Канал</label>
            {channels.length > 0 ? (
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Название нового канала"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button
                  onClick={createChannel}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
                >
                  Создать
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isShort}
              onChange={(e) => setIsShort(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <span className="text-sm">Это Short (вертикальное видео)</span>
          </label>

          {status === 'uploading' && (
            <div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">Загрузка: {progress}%</p>
            </div>
          )}

          {status === 'creating' && (
            <p className="text-sm text-brand-400">Модерация и постановка в очередь...</p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleUpload}
            disabled={status === 'uploading' || status === 'creating'}
            className="w-full rounded-full bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {status === 'uploading'
              ? `Загрузка ${progress}%...`
              : status === 'creating'
                ? 'Обработка...'
                : 'Загрузить'}
          </button>
        </div>
      )}
    </div>
  );
}
