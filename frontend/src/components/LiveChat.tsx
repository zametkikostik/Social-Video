'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Props {
  streamId: string;
}

export default function LiveChat({ streamId }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getToken();
    const socket = io(`${WS_URL}/live-chat`, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      socket.emit('join', { streamId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('history', (history: any[]) => {
      setMessages(history || []);
    });

    socket.on('message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('connect_error', () => {
      setError('Нет связи с чатом');
      setConnected(false);
    });

    return () => {
      socket.emit('leave');
      socket.disconnect();
    };
  }, [streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    socketRef.current.emit(
      'message',
      { streamId, text: text.trim() },
      (res: any) => {
        if (res?.error) setError(res.error);
      },
    );
    setText('');
  }

  return (
    <div className="flex flex-col h-[420px] rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400">
        <span>Чат эфира</span>
        <span className={connected ? 'text-green-500' : 'text-zinc-600'}>
          {connected ? '● online' : '○ offline'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-center py-8">Пока тихо...</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="leading-snug">
            <span className="font-medium text-brand-400">
              {m.user?.displayName || m.user?.username || '?'}
              {m.user?.isVerified && ' ✓'}
            </span>
            <span className="text-zinc-300">: {m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-3 text-xs text-red-400">{error}</p>}

      <form onSubmit={send} className="flex gap-2 p-2 border-t border-zinc-800">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder={getToken() ? 'Сообщение...' : 'Войдите, чтобы писать'}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-500 disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  );
}
