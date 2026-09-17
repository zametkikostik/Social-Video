'use client';

import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import {
  connectWallet,
  isMetaMaskAvailable,
  sendTipTransaction,
  shortAddress,
} from '@/lib/wallet';

const PRESETS = [100, 300, 500, 1000, 2500];

const PROVIDER_LABELS: Record<string, string> = {
  WEB3: 'Web3 (MetaMask)',
  STRIPE: 'Stripe (карта)',
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

export default function TipButton({
  toUserId,
  videoId,
  channelId,
  toName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(300);
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('WEB3');
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [web3Info, setWeb3Info] = useState<any>(null);
  const [wallet, setWallet] = useState<{ address: string; chainId: string } | null>(null);
  const [selectedToken, setSelectedToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    api
      .paymentProviders?.()
      .then((p: any) => {
        setProviders(p);
        const order = ['WEB3', 'STRIPE', 'YOOMONEY', 'PAYEER', 'CRYPTOBOT', 'INTERNAL'];
        const first = order.find((k) => p[k]);
        if (first) setProvider(first);
      })
      .catch(() => setProviders({ WEB3: true, INTERNAL: true }));
  }, [open]);

  async function connect() {
    setError('');
    try {
      setWallet(await connectWallet());
    } catch (e: any) {
      setError(e.message || 'Не удалось подключить кошелёк');
    }
  }

  async function send() {
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    setLoading(true);
    setError('');
    setWeb3Info(null);
    try {
      if (provider === 'WEB3' && !wallet) {
        try {
          await connect();
        } catch {}
      }
      const res = await api.paymentCheckout({
        toUserId,
        amount,
        message: message.trim() || undefined,
        videoId,
        channelId,
        provider,
        chainId: wallet?.chainId,
        fromAddress: wallet?.address,
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
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function payWithMetaMask() {
    if (!web3Info) return;
    setLoading(true);
    setError('');
    try {
      let from = wallet?.address;
      if (!wallet) {
        const w = await connectWallet();
        setWallet(w);
        from = w.address;
      }
      const token = web3Info.tokens?.[selectedToken];
      const txHash = await sendTipTransaction({
        toAddress: web3Info.toAddress,
        amountMinor: web3Info.amount,
        token: token
          ? { address: token.address, decimals: token.decimals }
          : undefined,
        chainId: web3Info.chainId,
      });
      await api.confirmWeb3Tip(web3Info.tipId, txHash, from);
      setDone(true);
      setWeb3Info(null);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1800);
    } catch (e: any) {
      setError(e?.message || 'Транзакция отклонена');
    } finally {
      setLoading(false);
    }
  }

  const enabled = Object.entries(providers).filter(([, v]) => v);
  const hasMm = isMetaMaskAvailable();

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
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Донат{toName ? ` · ${toName}` : ''}
              </h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 text-xl">
                ×
              </button>
            </div>

            {done ? (
              <p className="text-center text-green-400 py-6">Спасибо! 🎉</p>
            ) : web3Info ? (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-300">Оплата криптой на адрес креатора</p>
                <div className="rounded-lg bg-zinc-950 border border-zinc-700 p-3 font-mono text-xs break-all space-y-1">
                  <p className="text-zinc-500">Chain ID: {web3Info.chainId}</p>
                  <p className="text-amber-400">{web3Info.toAddress}</p>
                  <p>
                    {(web3Info.amount / 100).toFixed(2)} {web3Info.currency}
                  </p>
                </div>
                {web3Info.tokens?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {web3Info.tokens.map((t: any, i: number) => (
                      <button
                        key={t.address}
                        type="button"
                        onClick={() => setSelectedToken(i)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          selectedToken === i
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                )}
                {wallet ? (
                  <p className="text-xs text-zinc-400">
                    Кошелёк: {shortAddress(wallet.address)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={connect}
                    className="w-full rounded-lg border border-orange-500/50 bg-orange-950/30 py-2 text-sm text-orange-300"
                  >
                    {hasMm ? 'Подключить MetaMask' : 'Кошелёк не найден'}
                  </button>
                )}
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={payWithMetaMask}
                  disabled={loading || !hasMm}
                  className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {loading ? 'Подтвердите в MetaMask…' : 'Оплатить через MetaMask'}
                </button>
              </div>
            ) : (
              <>
                {provider === 'WEB3' && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs">
                    {wallet ? (
                      <span className="text-zinc-300">
                        🦊 {shortAddress(wallet.address)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        {hasMm ? 'MetaMask обнаружен' : 'Установите MetaMask'}
                      </span>
                    )}
                    <button type="button" onClick={connect} className="text-amber-400 hover:underline">
                      {wallet ? 'Сменить' : 'Connect'}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((cents) => (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => setAmount(cents)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        amount === cents
                          ? 'bg-amber-500 text-black font-medium'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      ${(cents / 100).toFixed(0)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value, 10) || 100)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {(enabled.length ? enabled : [['WEB3', true], ['INTERNAL', true]]).map(([k]) => (
                    <button
                      key={String(k)}
                      type="button"
                      onClick={() => setProvider(String(k))}
                      className={`rounded-full px-3 py-1 text-xs ${
                        provider === k ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {PROVIDER_LABELS[String(k)] || k}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Сообщение"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm resize-none"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  onClick={send}
                  disabled={loading || amount < 100}
                  className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {loading
                    ? '...'
                    : provider === 'WEB3'
                      ? `Далее · $${(amount / 100).toFixed(2)}`
                      : `Оплатить $${(amount / 100).toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
