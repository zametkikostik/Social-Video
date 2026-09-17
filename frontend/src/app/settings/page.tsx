'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken, getUser } from '@/lib/api';
import { connectWallet, isMetaMaskAvailable, shortAddress } from '@/lib/wallet';

export default function SettingsPage() {
  const router = useRouter();
  const [payoutAddress, setPayoutAddress] = useState('');
  const [yoomoneyWallet, setYoomoneyWallet] = useState('');
  const [payeerAccount, setPayeerAccount] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [user, setUserState] = useState<any>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/auth/login');
      return;
    }
    setUserState(getUser());
    api
      .me?.()
      .then((u: any) => {
        setUserState(u);
        if (u.payoutAddress) setPayoutAddress(u.payoutAddress);
        if (u.yoomoneyWallet) setYoomoneyWallet(u.yoomoneyWallet);
        if (u.payeerAccount) setPayeerAccount(u.payeerAccount);
      })
      .catch(() => {});
  }, [router]);

  async function fillFromMetaMask() {
    setError('');
    try {
      const w = await connectWallet();
      setPayoutAddress(w.address);
    } catch (e: any) {
      setError(e.message || 'MetaMask error');
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      if (payoutAddress && !/^0x[a-fA-F0-9]{40}$/.test(payoutAddress)) {
        throw new Error('Некорректный EVM-адрес (0x + 40 hex)');
      }
      await api.setPayoutSettings({
        payoutAddress: payoutAddress || undefined,
        yoomoneyWallet: yoomoneyWallet || undefined,
        payeerAccount: payeerAccount || undefined,
      });
      setMsg('Сохранено');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-zinc-500 mt-1">{user?.email || user?.username}</p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="font-semibold text-lg">Выплаты и донаты</h2>
        <p className="text-xs text-zinc-500">
          Укажите кошельки для донатов. Web3 — основной способ.
        </p>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              EVM-адрес (Polygon / ETH / BSC / Base)
            </label>
            <div className="flex gap-2">
              <input
                value={payoutAddress}
                onChange={(e) => setPayoutAddress(e.target.value.trim())}
                placeholder="0x..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={fillFromMetaMask}
                className="rounded-lg border border-orange-600/40 bg-orange-950/30 px-3 py-2 text-xs text-orange-300 whitespace-nowrap"
              >
                {isMetaMaskAvailable() ? 'Из MetaMask' : 'MetaMask'}
              </button>
            </div>
            {payoutAddress && (
              <p className="text-[10px] text-zinc-600 mt-1">{shortAddress(payoutAddress)}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">ЮMoney</label>
            <input
              value={yoomoneyWallet}
              onChange={(e) => setYoomoneyWallet(e.target.value.trim())}
              placeholder="41001..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Payeer</label>
            <input
              value={payeerAccount}
              onChange={(e) => setPayeerAccount(e.target.value.trim())}
              placeholder="P1000000"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {msg && <p className="text-sm text-green-400">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </form>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/tips" className="text-zinc-400 hover:text-white">
          Мои донаты →
        </Link>
      </div>
    </div>
  );
}
