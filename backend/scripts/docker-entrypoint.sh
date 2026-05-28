#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  attempt=1

  until npx prisma migrate deploy; do
    if [ "$attempt" -ge 30 ]; then
      echo "No fue posible aplicar las migraciones Prisma despues de $attempt intentos."
      exit 1
    fi

    echo "Esperando PostgreSQL para aplicar migraciones... intento $attempt/30"
    attempt=$((attempt + 1))
    sleep 2
  done
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  npm run db:seed
fi

exec node dist/index.js
