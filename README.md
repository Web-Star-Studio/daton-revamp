# Daton Revamp

## Local Development Database

Local development defaults to Postgres on `127.0.0.1:5432/daton`.

- `pnpm dev` uses `apps/api/.dev.vars` for Wrangler local development.
- `pnpm dev:docker` uses `apps/api/.dev.vars.docker` and the `postgres` service from `docker-compose.yml`.
- Root-level tooling such as `pnpm db:migrate`, `pnpm db:generate`, `pnpm db:studio`, and Better Auth CLI config now load the repo root `.env` and therefore default to local Postgres as well.

### Start local Postgres

```bash
docker compose up -d postgres
```

### Run local development

```bash
pnpm dev
```

### Intentionally target a remote database

Remote databases such as Neon are opt-in only. For one-off commands, pass `DATABASE_URL` explicitly in your shell:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require' pnpm db:migrate
```
