# Social-Video — Smoke Test Checklist

After `docker compose up -d --build`.

## Infra
- [ ] `docker compose ps` healthy
- [ ] `curl -s http://localhost:4000/api/payments/providers`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200

## Auth
- [ ] Register / Login seed `admin@social.video` / `Admin123!`
- [ ] `/api/users/me` 200

## VOD
- [ ] Create channel, upload → READY, HLS on `/watch/:id`

## Social
- [ ] Like, comment, subscribe, playlist

## Shorts / Search / Live
- [ ] `/shorts`, search, `/go-live` + OBS RTMP + chat

## Moderation / Admin
- [ ] `/admin` queue Approve/Reject

## Payments
- [ ] `/settings` payout + tip INTERNAL/WEB3

## Federation (partial)
- [ ] WebFinger + `/api/ap/channels/:slug` + outbox

## i18n / PWA
- [ ] Language switcher, manifest.json

## Prod
- [ ] Strong JWT_SECRET, HTTPS, R2, change seed passwords
