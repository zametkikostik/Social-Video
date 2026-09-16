'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register({
        email,
        username,
        password,
        displayName: displayName || undefined,
      });
      setToken(res.accessToken);
      setUser(res.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Регистрация</h1>
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
          <label className="block text-sm text-zinc-400 mb-1.5">Username</label>
          <input
            type="text"
            required
            minLength={3}
            pattern="[a-zA-Z0-9_]+"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="только латиница, цифры, _"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Отображаемое имя</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Пароль</label>
          <input
            type="password"
            required
            minLength={8}
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
          {loading ? 'Создание...' : 'Создать аккаунт'}
        </button>
        <p className="text-center text-sm text-zinc-500">
          Уже есть аккаунт?{' '}
          <a href="/auth/login" className="text-brand-500 hover:underline">
            Войти
          </a>
        </p>
      </form>
    </div>
  );
}
