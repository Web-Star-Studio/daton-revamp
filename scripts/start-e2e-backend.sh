#!/usr/bin/env bash

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  docker compose up -d postgres
  export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/daton"

  for attempt in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U postgres -d daton >/dev/null 2>&1; then
      break
    fi

    if [ "$attempt" -eq 30 ]; then
      echo "Postgres did not become ready in time." >&2
      exit 1
    fi

    sleep 1
  done
fi

export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_placeholder}"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:8787"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"
export INTERNAL_API_URL="http://127.0.0.1:8787"
export CORS_ORIGIN="http://127.0.0.1:3000"
export ALLOW_FICTIONAL_CNPJ="true"

pnpm db:migrate
pnpm --filter @daton/backend dev
