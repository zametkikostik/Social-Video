'use client';

import { useEffect, useState } from 'react';
import { api, getToken, getUser } from '@/lib/api';

function RelayAdmin() {
  const [relays, setRelays] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const isAdmin = getUser()?.role === 'ADMIN';

  useEffect(() => {
    api.apRelays?.().then(setRelays).catch(() => {});
  }, []);

  if (!isAdmin) {
    return <p className="text-xs text-zinc-600">Sign in as admin to manage relays.</p>;
  }

  async function add() {
    setMsg('');
    try {
      await api.apAddRelay(url);
      setMsg('Relay subscribed');
      setRelays(await api.apRelays());
    } catch (e: any) {
      setMsg(e.message || 'Error');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://relay.example/actor"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs"
        />
        <button type="button" onClick={add} className="rounded-full bg-zinc-100 text-zinc-900 px-3 py-1 text-xs">
          Add
        </button>
      </div>
      {msg && <p className="text-xs text-zinc-500">{msg}</p>}
      <ul className="text-xs space-y-1">
        {relays.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 border border-zinc-800 rounded px-2 py-1">
            <span className="truncate">{r.name || r.actorUrl}</span>
            <span>{r.enabled ? (r.accepted ? 'ok' : 'pending') : 'off'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FederatePage() {
  const [resource, setResource] = useState('');
  const [following, setFollowing] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [resolved, setResolved] = useState<any>(null);

  function load() {
    if (!getToken()) return;
    api.apFollowing?.().then(setFollowing).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve() {
    setMsg('');
    try {
      const a = await api.apResolve(resource);
      setResolved(a);
    } catch (e: any) {
      setMsg(e.message || 'Resolve failed');
    }
  }

  async function follow() {
    if (!getToken()) {
      window.location.href = '/auth/login';
      return;
    }
    setMsg('Sending Follow…');
    try {
      const r = await api.apFollow(resource);
      setMsg(r.ok ? 'Follow sent (await Accept)' : r.error || 'Failed');
      load();
    } catch (e: any) {
      setMsg(e.message || 'Error');
    }
  }

  async function unfollow(remoteActor: string) {
    try {
      await api.apUnfollow(remoteActor);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Fediverse</h1>
      <p className="text-sm text-zinc-500">
        Follow remote actors via ActivityPub. Example:{' '}
        <code className="text-xs">acct:channel@peertube.example</code>
      </p>
      <div className="flex flex-col gap-2">
        <input
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          placeholder="acct:user@domain or https://…/actors/…"
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="button" onClick={resolve} className="rounded-full border border-zinc-600 px-4 py-2 text-xs">
            Resolve
          </button>
          <button type="button" onClick={follow} className="rounded-full bg-brand-600 px-4 py-2 text-xs text-white">
            Follow
          </button>
        </div>
      </div>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
      {resolved && (
        <pre className="text-xs overflow-auto rounded-xl bg-zinc-900 p-3 max-h-48">
          {JSON.stringify(
            { id: resolved.id, name: resolved.name || resolved.preferredUsername, inbox: resolved.inbox },
            null,
            2,
          )}
        </pre>
      )}
      <section className="space-y-2">
        <h2 className="font-semibold">Relays (admin)</h2>
        <p className="text-xs text-zinc-500">PeerTube-style relay — public videos fan-out there too.</p>
        <RelayAdmin />
      </section>
      <section>
        <h2 className="font-semibold mb-2">Following</h2>
        <ul className="space-y-2 text-sm">
          {following.map((f) => (
            <li key={f.id} className="flex justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2">
              <span className="truncate text-zinc-300">{f.remoteActor}</span>
              <span className="text-xs text-zinc-500">{f.accepted ? 'accepted' : 'pending'}</span>
              <button type="button" className="text-xs text-red-400" onClick={() => unfollow(f.remoteActor)}>
                Unfollow
              </button>
            </li>
          ))}
          {!following.length && <li className="text-zinc-600 text-xs">No remote follows yet</li>}
        </ul>
      </section>
    </div>
  );
}
