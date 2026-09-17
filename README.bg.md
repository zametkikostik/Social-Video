# Social-Video

**Социална видео платформа с отворен код** — самостоятелно хоствана алтернатива на YouTube с VOD, на живо, Shorts, донации, AI модерация, Cloudflare R2, плъгини и ActivityPub федерация.

**Лиценз:** [GNU Affero General Public License v3.0](./LICENSE) (AGPLv3)

**Репозиторий:** https://github.com/zametkikostik/Social-Video

**Езици:** [English](./README.md) · [Български](./README.bg.md)

---

## Функции

| Област | Възможности |
|--------|-------------|
| **VOD** | Качване → FFmpeg HLS → Cloudflare R2 / MinIO |
| **Shorts** | Вертикална лента за кратки видеа |
| **На живо** | RTMP (nginx-rtmp) + HLS + чат WebSocket |
| **Социални** | Канали, абонаменти, харесвания, коментари, плейлисти |
| **Модерация** | AI + евристики; верифицирани автори без авто-бан |
| **Съхранение** | R2 (продукция) · MinIO (dev) · опционален IPFS |
| **Монетизация** | Донати: Web3/MetaMask, Stripe, YooMoney, Payeer, CryptoBot |
| **Hype** | Промоция на видеа в препоръките |
| **Аудио пътеки** | Многоезичен дублаж / TTS |
| **i18n UI** | en, ru, bg, tr, th, zh, fr, it, pt-BR, es |
| **Съответствие** | Cookie, Privacy/Terms, GDPR експорт и изтриване |
| **PWA / Admin / Плъгини / Метрики** | Да |
| **Федерация** | ActivityPub (виж по-долу) |

### ActivityPub федерация (вече е включена)

| Функция | Статус |
|---------|--------|
| WebFinger | Да |
| Actor + ключове | Да |
| Outbox / Inbox (Follow + Accept) | Да |
| HTTP Signatures (rsa-sha256) | Да |
| Fan-out при готово видео | Да |
| Пълен PeerTube (relay, remote media, UI) | Частично / roadmap |

Достатъчно за базова съвместимост с fediverse.

---

## Бърз старт

```bash
docker compose up -d
cd backend && cp ../.env.example .env && npm install && npx prisma migrate dev && npm run seed && npm run start:dev
cd frontend && npm install && npm run dev
```

Seed: `admin@social.video` / `Admin123!` (сменете в продукция).

## Продукция

Вижте [docs/PRODUCTION.md](./docs/PRODUCTION.md).

```bash
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Лиценз

GNU **AGPLv3** — [LICENSE](./LICENSE).
