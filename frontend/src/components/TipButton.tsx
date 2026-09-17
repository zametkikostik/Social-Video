'use client';

import { useState } from 'react';
import { api, getToken } from '@/lib/api';

const PRESETS = [100, 300, 500, 1000, 2500];

interface Props {
  toUserId: string;
  videoId?: string;
  channelId?: string;
  toName?: string;
}

export default function TipButton({ toUserId, videoId, channelId, toName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(300);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.sendTip({
        toUserId,
        amount,
        message: message.trim() || undefined,
        videoId,
        channelId,
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setMessage('');
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-amber-600/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-900/40 transition"
      >
        ☕ Донат
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Донат{toName ? ` · ${toName}` : ''}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>

            {done ? (
              <p className="text-center text-green-400 py-6">Спасибо! 🎉</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((cents) => (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => setAmount(cents)}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        amount === cents
                          ? 'bg-amber-500 text-black font-medium'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      ${(cents / 100).toFixed(0)}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-zinc-500">Своя сумма (центы, мин. 100)</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value, 10) || 100)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-500">= ${(amount / 100).toFixed(2)} USD</p>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Сообщение (необязательно)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none resize-none"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <p className="text-xs text-zinc-600">
                  Self-hosted: донат записывается сразу (без платёжного шлюза). Stripe/crypto можно подключить позже.
                </p>

                <button
                  onClick={send}
                  disabled={loading || amount < 100}
                  className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {loading ? 'Отправка...' : `Отправить $${(amount / 100).toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
