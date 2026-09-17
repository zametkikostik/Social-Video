'use client';

import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';

const PRESETS = [100, 300, 500, 1000, 2500];
const PROVIDER_LABELS: Record<string, string> = {
  WEB3: 'Web3 (crypto)',
  STRIPE: 'Stripe (card)',
  YOOMONEY: 'ЮMoney',
  PAYEER: 'Payeer',
  CRYPTOBOT: 'Crypto Bot',
  INTERNAL: 'Тест',
};

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
  const [provider, setProvider] = useState('WEB3');
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [web3Info, setWeb3Info] = useState<any>(null);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!open) return;
    api.paymentProviders?.()
      .then((p: any) => {
        setProviders(p);
        const order = ['WEB3', 'STRIPE', 'YOOMONEY', 'PAYEER', 'CRYPTOBOT', 'INTERNAL'];
        const first = order.find((k) => p[k]);
        if (first) setProvider(first);
      })
      .catch(() => setProviders({ WEB3: true, INTERNAL: true }));
  }, [open]);

  async function send() {
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    setLoading(true);
    setError('');
    setWeb3Info(null);
    try {
      const res = await api.paymentCheckout({
        toUserId,
        amount,
        message: message.trim() || undefined,
        videoId,
        channelId,
        provider,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.web3) {
        setWeb3Info(res.web3);
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function confirmTx() {
    if (!web3Info?.tipId || !txHash) return;
    setLoading(true);
    try {
      await api.confirmWeb3Tip(web3Info.tipId, txHash);
      setDone(true);
      setWeb3Info(null);
      setTimeout(() => { setOpen(false); setDone(false); }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  const enabled = Object.entries(providers).filter(([, v]) => v);

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-amber-600/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-900/40">
        ☕ Донат
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between">
              <h3 className="font-semibold">Донат{toName ? ` · ${toName}` : ''}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 text-xl">×</button>
            </div>
            {done ? (
              <p className="text-center text-green-400 py-6">Спасибо! 🎉</p>
            ) : web3Info ? (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-300">Отправьте крипту, затем вставьте tx hash:</p>
                <div className="rounded-lg bg-zinc-950 border border-zinc-700 p-3 font-mono text-xs break-all">
                  <p>Chain: {web3Info.chainId}</p>
                  <p className="text-amber-400 mt-1">{web3Info.toAddress}</p>
                  <p className="mt-1">{web3Info.amount} {web3Info.currency}</p>
                </div>
                <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono" />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button onClick={confirmTx} disabled={loading || !txHash} className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
                  Подтвердить
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((c) => (
                    <button key={c} type="button" onClick={() => setAmount(c)} className={`rounded-full px-3 py-1.5 text-sm ${amount === c ? 'bg-amber-500 text-black' : 'bg-zinc-800'}`}>
                      ${(c / 100).toFixed(0)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(enabled.length ? enabled : [['WEB3', true], ['INTERNAL', true]]).map(([k]) => (
                    <button key={String(k)} type="button" onClick={() => setProvider(String(k))} className={`rounded-full px-3 py-1 text-xs ${provider === k ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {PROVIDER_LABELS[String(k)] || k}
                    </button>
                  ))}
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Сообщение" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button onClick={send} disabled={loading} className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black">
                  {loading ? '...' : `Оплатить $${(amount / 100).toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
