# Social-Video

**Open-source social video platform** — self-hosted alternative to YouTube with VOD, Live, Shorts, tips, AI moderation, Cloudflare R2, and ActivityPub federation.

**License:** [GNU Affero General Public License v3.0](./LICENSE) (AGPLv3)

**Repo:** https://github.com/zametkikostik/Social-Video

---

## Features

| Area | Capabilities |
|------|----------------|
| **VOD** | Upload → FFmpeg multi-quality HLS → R2/MinIO |
| **Shorts** | Vertical feed |
| **Live** | RTMP ingest (nginx-rtmp) + HLS playback + WebSocket chat |
| **Social** | Channels, subs, likes, comments, playlists, community posts |
| **Moderation** | AI + heuristics; verified users skip auto-ban |
| **Storage** | Cloudflare R2 (primary) · MinIO (local) · optional IPFS pin |
| **Monetization** | Tips / donations (gateway-ready) |
| **Discovery** | Ranked feed, related videos, search |
| **PWA** | Installable, offline shell, mobile bottom nav |
| **Admin** | Stats, user roles, verification, moderation queue |
| **Federation** | ActivityPub: WebFinger, Actor, Outbox, Inbox, **HTTP Signatures**, fan-out |

---

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
# Postgres :5432 · Redis :6379 · MinIO :9000 (console :9001) · RTMP :1935 · HLS :8080
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
python3 scripts/generate-icons.py
npm run dev               # http://localhost:3000
```

### Default seed accounts

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@social.video` | `Admin123!` |
| MODERATOR | `mod@social.video` | `Mod123!` |

Admin UI: `/admin`

---

## Environment

See `.env.example`. Key variables:

```env
DATABASE_URL=postgresql://socialvideo:socialvideo@localhost:5432/socialvideo
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=social-video
APP_URL=http://localhost:3000
AP_BASE_URL=http://localhost:4000
```

---

## ActivityPub

Outbound **Create** activities are **HTTP Signature–signed** (rsa-sha256) and delivered to remote followers when a video becomes `READY`.

| Endpoint | Description |
|----------|-------------|
| `GET /api/.well-known/webfinger` | Discovery |
| `GET /api/ap/channels/:slug` | Actor + public key |
| `GET /api/ap/channels/:slug/outbox` | Create(Video) collection |
| `POST /api/ap/channels/:slug/inbox` | Follow / Undo + signed Accept |

Docs: `/federation`

---

## License

GNU AGPLv3 — see [LICENSE](./LICENSE).
