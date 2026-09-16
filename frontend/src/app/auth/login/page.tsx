'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setToken(res.accessToken);
      setUser(res.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Вход</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Пароль</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
        <p className="text-center text-sm text-zinc-500">
          Нет аккаунта?{' '}
          <a href="/auth/register" className="text-brand-500 hover:underline">
            Зарегистрироваться
          </a>
        </p>
      </form>
    </div>
  );
}
