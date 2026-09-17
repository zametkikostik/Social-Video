#!/bin/sh
set -e
echo "→ prisma migrate deploy"
npx prisma migrate deploy || npx prisma db push --accept-data-loss
if [ "$RUN_SEED" = "true" ]; then
  echo "→ seed"
  npm run seed || true
fi
exec "$@"
