export default function FederationInfoPage() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">ActivityPub Federation</h1>
      <p className="text-zinc-400 text-sm">
        Social-Video поддерживает базовый ActivityPub: WebFinger, Actor, Outbox,
        Inbox (Follow/Accept). Совместимо с Mastodon / PeerTube на уровне discovery.
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 text-sm font-mono">
        <p>
          <span className="text-zinc-500">WebFinger:</span>{' '}
          {api}/.well-known/webfinger?resource=acct:CHANNEL@host
        </p>
        <p>
          <span className="text-zinc-500">Actor:</span> {api}/ap/channels/:slug
        </p>
        <p>
          <span className="text-zinc-500">Outbox:</span> {api}/ap/channels/:slug/outbox
        </p>
        <p>
          <span className="text-zinc-500">Inbox:</span> POST {api}/ap/channels/:slug/inbox
        </p>
        <p>
          <span className="text-zinc-500">NodeInfo:</span> {api}/.well-known/nodeinfo
        </p>
      </div>
      <p className="text-xs text-zinc-600">
        Для продакшена проксируй <code>/.well-known/*</code> на API и выставь{' '}
        <code>AP_BASE_URL</code> на публичный HTTPS origin.
      </p>
    </div>
  );
}
