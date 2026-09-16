# Social-Video

**Открытый social video hosting** — современная альтернатива YouTube с поддержкой VOD, Live, Shorts, монетизацией и Cloudflare R2.

Лицензия: **GNU Affero General Public License v3.0 (AGPLv3)**

Репозиторий: https://github.com/zametkikostik/Social-Video

## Цели проекта

- Полноценный видео-хостинг с социальными функциями
- Все ключевые новинки YouTube 2025–2026 (Shorts, Live improvements, AI-ready, Community Posts)
- Самостоятельный хостинг + возможность федерации (ActivityPub)
- **Cloudflare R2** как основной object storage (zero egress)
- **AI Moderator** — авто-модерация токсичного контента + soft-pass для verified
- Мобильные приложения (Phase 3)
- Плагинная архитектура

## Архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Web Frontend   │     │  Mobile Apps     │     │  Embed Player   │
│  (Next.js 15)   │◄───►│  (React Native)  │     │  (HLS.js)       │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   API Gateway / Nginx  │
                    │   + Cloudflare         │
                    └────────────┬───────────┘
                                 ▼
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│  Backend API    │   │  Transcoder      │   │  Live Server    │
│  (NestJS + TS)  │   │  (FFmpeg +       │   │  (NGINX-RTMP +  │
│  + AI Moderator │   │   BullMQ/Redis)  │   │   WebRTC)       │
└────────┬────────┘   └────────┬─────────┘   └────────┬────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│  PostgreSQL     │   │  Cloudflare R2   │   │  Redis          │
│  (metadata)     │   │  (videos, HLS)   │   │  (cache/queue)  │
└─────────────────┘   └──────────────────┘   └─────────────────┘
```

## Технологический стек

| Слой              | Технологии                              |
|-------------------|-----------------------------------------|
| Frontend          | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Backend           | NestJS, TypeScript, Prisma             |
| Database          | PostgreSQL 16                          |
| Cache / Queue     | Redis + BullMQ                         |
| Object Storage    | Cloudflare R2 (S3-compatible)          |
| Transcoding       | FFmpeg → multi-quality HLS             |
| Moderation        | OpenAI Moderation API + local heuristic |
| Live              | NGINX-RTMP / MediaMTX + WebRTC         |
| Auth              | JWT + OAuth2                           |
| Player            | HLS.js / Video.js                      |
| Infra             | Docker Compose, Cloudflare             |

## План разработки

### Phase 0 — Foundation ✅
- [x] Структура репозитория
- [x] Docker Compose (Postgres, Redis, MinIO)
- [x] Backend NestJS + Prisma schema
- [x] Frontend Next.js skeleton
- [x] Cloudflare R2 / MinIO интеграция
- [x] Auth (register / login / JWT)
- [x] AI Moderator (verified soft-pass)
- [x] Upload + Transcoder (BullMQ + FFmpeg → HLS)

### Phase 1 — Core VOD (следующая)
- [ ] Страница загрузки (frontend)
- [ ] Видео-страница + HLS-плеер
- [ ] Подписки, лайки, комментарии
- [ ] Плейлисты
- [ ] Поиск и базовые рекомендации

### Phase 2 — Social + Live
- Shorts (вертикальный feed)
- Live streaming (RTMP + WebRTC)
- Community Posts, notifications
- Realtime chat

### Phase 3 — Monetization & Scale
- Subscriptions / PPV / Donations
- Ads (VAST)
- Analytics + CDN
- Mobile apps (React Native)

### Phase 4 — Advanced
- AI recommendations, auto-captions, smart thumbnails
- ActivityPub federation
- P2P (WebRTC segments)
- Admin panel + advanced moderation

## Upload flow

1. `POST /api/storage/upload-url` → presigned URL (R2/MinIO)
2. Клиент заливает файл напрямую
3. `POST /api/videos` (title, channelId, originalKey) → AI moderation → enqueue transcode
4. Worker: FFmpeg → 1080p/720p/480p/360p HLS + thumbnail → R2
5. Статус видео → `READY`

## AI Moderator

| Тип пользователя | Токсичный контент | Результат |
|------------------|-------------------|-----------|
| Обычный | score ≥ 0.7 | Quarantine / Reject |
| **Verified** | любой score | `SKIPPED_VERIFIED` + лог |
| Moderator/Admin | — | Ручной override |

## Быстрый старт (локально)

```bash
git clone https://github.com/zametkikostik/Social-Video.git
cd Social-Video
cp .env.example .env
# Заполни Cloudflare R2 credentials (или используй MinIO локально)
# Опционально: OPENAI_API_KEY для модерации

docker compose up -d

cd backend && npm install && npx prisma migrate dev
npm run start:dev          # API :4000

cd ../frontend && npm install
npm run dev                # UI :3000
```

**Требования:** FFmpeg и ffprobe должны быть в PATH на машине, где крутится backend.

## Структура репозитория

```
/
├── backend/          # NestJS API
│   └── src/modules/
│       ├── auth/
│       ├── users/
│       ├── channels/
│       ├── videos/
│       ├── storage/      # R2 + MinIO
│       ├── moderation/   # AI Moderator
│       └── transcoder/   # BullMQ + FFmpeg
├── frontend/         # Next.js web app
├── docker-compose.yml
├── LICENSE           # AGPLv3
└── README.md
```

## Вдохновение

- [AVideo](https://github.com/wwbn/avideo) — плагины и mature PHP-стек
- [PeerTube](https://github.com/Chocobozzz/PeerTube) — federation + P2P
- [Odysee](https://github.com/OdyseeTeam) — decentralized + mobile
- StreamPHP Marketplace — идеи плагинов и monetization

## Лицензия

Этот проект распространяется под **GNU Affero General Public License v3.0**.  
См. файл [LICENSE](./LICENSE).

---

Сделано с ❤️ для открытого видео.  
Если хочешь помочь — открывай Issues и Pull Requests!
