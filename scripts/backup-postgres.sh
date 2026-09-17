#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP=$(date -u +%Y%m%d_%H%M%S)
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"

if docker compose -f "$ROOT/docker-compose.prod.yml" ps postgres 2>/dev/null | grep -q Up; then
  docker compose -f "$ROOT/docker-compose.prod.yml" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-socialvideo}" "${POSTGRES_DB:-socialvideo}" \
    | gzip > "$OUT_DIR/socialvideo_${STAMP}.sql.gz"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-socialvideo}" pg_dump \
    -h "${POSTGRES_HOST:-localhost}" \
    -U "${POSTGRES_USER:-socialvideo}" \
    "${POSTGRES_DB:-socialvideo}" \
    | gzip > "$OUT_DIR/socialvideo_${STAMP}.sql.gz"
fi

find "$OUT_DIR" -name 'socialvideo_*.sql.gz' -mtime +14 -delete 2>/dev/null || true
echo "Backup OK: $OUT_DIR/socialvideo_${STAMP}.sql.gz"
