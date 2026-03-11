#!/usr/bin/env bash

set -euo pipefail

docker compose up -d postgres

export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/daton"
export WORKOS_API_KEY="sk_test_test-api-key"
export WORKOS_CLIENT_ID="client_test_123456789"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:8787"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"
export CORS_ORIGIN="http://127.0.0.1:3000"
export ALLOW_FICTIONAL_CNPJ="true"

pnpm db:migrate
pnpm --filter @daton/backend dev
