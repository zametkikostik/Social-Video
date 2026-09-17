# Social-Video

**Open-source social video platform** — self-hosted alternative to YouTube with VOD, Live, Shorts, multi-provider tips, AI moderation, Cloudflare R2, plugins, and ActivityPub federation.

**License:** [GNU Affero General Public License v3.0](./LICENSE) (AGPLv3)

**Repository:** https://github.com/zametkikostik/Social-Video

**Languages:** [English](./README.md) · [Български](./README.bg.md)

---

## Features

| Area | Capabilities |
|------|----------------|
| **VOD** | Upload → FFmpeg multi-quality HLS → Cloudflare R2 / MinIO |
| **Shorts** | Vertical short-form feed |
| **Live** | RTMP ingest (nginx-rtmp) + HLS + WebSocket chat |
| **Social** | Channels, subscriptions, likes, comments, playlists, community posts |
| **Moderation** | AI + heuristics; verified creators can bypass auto-quarantine |
| **Storage** | R2 (production) · MinIO (dev) · optional IPFS pin |
| **Monetization** | Tips: Web3/MetaMask, Stripe, YooMoney, Payeer, CryptoBot |
| **Hype** | Promote videos in the recommendation feed for a limited time |
| **Audio tracks** | Multi-language dub / TTS pipeline (owner-requested) |
| **i18n UI** | en, ru, bg, tr, th, zh, fr, it, pt-BR, es |
| **Compliance** | Cookie consent, Privacy/Terms, GDPR export & account delete |
| **Discovery** | Ranked feed, related videos, search |
| **PWA** | Installable progressive web app |
| **Admin** | Roles, verification, moderation queue, stats |
| **Plugins** | Hook-based extensions (`onVideoReady`, `onTipCompleted`, …) |
| **Metrics** | Prometheus-compatible `GET /api/metrics` |
| **Federation** | ActivityPub (see below) |

### ActivityPub federation (included)

Social-Video **already includes** an ActivityPub foundation:

| Endpoint / behaviour | Status |
|----------------------|--------|
| WebFinger | Yes |
| Actor (channel/user) + keypair | Yes |
| Outbox (Create Video activities) | Yes |
| Inbox (Follow + Accept) | Yes |
| HTTP Signatures (rsa-sha256) signed delivery | Yes |
| Fan-out announce on video ready | Yes |
| Full PeerTube-level (relays, remote media proxy, Like/Announce UI) | Partial / roadmap |

Enough for basic interop with the fediverse; not a full PeerTube replacement yet.

---

## Quick start (development)

### 1. Infrastructure

```bash
docker compose up -d
# Postgres :5432 · Redis :6379 · MinIO :9000 · RTMP :1935
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate dev
npm run seed              # admin@social.video / Admin123!
npm run start:dev         # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

### Seed accounts (change in production)

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@social.video` | `Admin123!` |
| MODERATOR | `mod@social.video` | `Mod123!` |

---

## Production deploy

See **[docs/PRODUCTION.md](./docs/PRODUCTION.md)**.

```bash
cp .env.production.example .env.production
# Set DOMAIN, JWT_SECRET, POSTGRES_PASSWORD, R2 keys, WEB3_RPC_URL, …
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
curl -s https://$DOMAIN/api/health/ready
```

Smoke tests: [docs/SMOKE_CHECKLIST.md](./docs/SMOKE_CHECKLIST.md)

---

## Architecture

```
Next.js 15  ──►  NestJS API  ──►  PostgreSQL + Prisma
     │                │
     │                ├── Redis + BullMQ (transcode / jobs)
     │                ├── R2 / MinIO (objects)
     │                ├── nginx-rtmp (live)
     │                └── plugins/ (hooks)
     └── PWA + i18n
```

---

## Plugins

```
plugins/my-plugin/
  manifest.json
  index.js
```

Hooks: `onVideoReady`, `onCommentCreate`, `onTipCompleted`, `onUserRegister`, `onLiveStart`

List: `GET /api/plugins` — see [plugins/README.md](./plugins/README.md)

---

## API highlights

| Path | Description |
|------|-------------|
| `GET /api/health` · `/api/health/ready` | Liveness / readiness |
| `GET /api/metrics` | Prometheus metrics |
| `GET /api/plugins` | Loaded plugins |
| `GET /api/.well-known/webfinger` | Federation discovery |
| `GET /api/ap/channels/:slug` | ActivityPub Actor |

---

## License

GNU **AGPLv3** — see [LICENSE](./LICENSE).
