'use client';

import { useEffect, useRef, useState } from 'react';
import { api, getToken } from '@/lib/api';

export default function AudioTrackSelector({ videoId, isOwner }: { videoId: string; isOwner?: boolean }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [lang, setLang] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [msg, setMsg] = useState('');

  function load() {
    api.getAudioTracks?.(videoId).then(setTracks).catch(() => {});
  }
  useEffect(() => { load(); }, [videoId]);

  function onSelect(track: any) {
    if (!track.audioUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = track.audioUrl;
    audioRef.current.play().catch(() => {});
  }

  async function requestDub(language: string) {
    if (!getToken()) { window.location.href = '/auth/login'; return; }
    setMsg('Запрос озвучки…');
    try {
      await api.requestAudioTrack(videoId, language);
      setMsg('В обработке');
      load();
    } catch (e: any) {
      setMsg(e.message || 'Error');
    }
  }

  const langs = ['en', 'ru', 'bg', 'tr', 'th', 'zh', 'fr', 'it', 'pt-BR', 'es'];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2 text-sm">
      <p className="text-xs text-zinc-500 font-medium">Озвучка / Audio tracks</p>
      {tracks.length === 0 ? (
        <p className="text-xs text-zinc-600">Пока только оригинал</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button key={t.id} type="button" onClick={() => onSelect(t)} className="rounded-full bg-zinc-800 px-3 py-1 text-xs">
              {t.language}
            </button>
          ))}
        </div>
      )}
      {isOwner && (
        <div className="flex flex-wrap gap-2 items-center">
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs">
            <option value="">Язык дубляжа…</option>
            {langs.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button type="button" disabled={!lang} onClick={() => requestDub(lang)} className="rounded-full bg-brand-600 px-3 py-1 text-xs disabled:opacity-40">
            Запросить озвучку
          </button>
        </div>
      )}
      {msg && <p className="text-xs text-zinc-500">{msg}</p>}
    </div>
  );
}
