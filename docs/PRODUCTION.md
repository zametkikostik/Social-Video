# Social-Video — Production launch

## 1. Server
Ubuntu 22.04+, 4+ GB RAM, Docker + Compose. DNS A record → server.

## 2. Secrets
```bash
cp .env.production.example .env.production
openssl rand -base64 48   # JWT_SECRET
# fill DOMAIN, POSTGRES_PASSWORD, R2, payments
```

## 3. Start
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
curl -s https://$DOMAIN/api/health
curl -s https://$DOMAIN/api/health/ready
```

## 4. Live (optional)
```bash
docker compose -f docker-compose.prod.yml --profile live up -d nginx-rtmp
```

## 5. Backup
```bash
chmod +x scripts/backup-postgres.sh
# cron: 0 3 * * * cd /opt/Social-Video && ./scripts/backup-postgres.sh
```

## 6. Smoke
See docs/SMOKE_CHECKLIST.md over HTTPS.

## Defaults
- Rate limit 120/min (20 auth)
- AP signatures on
- No seed in prod
- API only via Caddy
