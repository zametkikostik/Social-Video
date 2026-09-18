# Hardening notes

## Rate limit (Redis)
- `REDIS_URL` → distributed counters
- Auth ≤ 20/min · Upload ≤ 30/min · API ≤ 120/min
- Skipped: `/api/health`, `/api/metrics`, `/.well-known/*`, GET `/api/ap/*`

## SEO
- `/watch/[id]` — Open Graph + Twitter card via `generateMetadata`
- `/channel/[slug]` — channel OG tags

## Relays
- Accept from relay marks `ApRelay.accepted`
- Create(Video) fan-out includes relay inboxes

## Plugins / metrics
- `onUserRegister` on signup
- Gauge `socialvideo_plugins_loaded` on `/api/metrics`
