# Daton Revamp

## Architecture

- `apps/web` runs the Next.js user-facing application.
- `apps/backend` is the Node/Fastify API that backs the Next.js BFF routes.
- `packages/contracts`, `packages/auth`, and `packages/db` remain shared workspace packages.
- Production targets Render with two Docker web services (`web` and `backend`) plus Render Postgres.

## Local Development Database

Local development defaults to Postgres on `127.0.0.1:5432/daton`.

- `pnpm dev` starts `@daton/backend` and `@daton/web`.
- `pnpm dev:docker` starts `backend`, `web`, and `postgres` with Docker Compose.
- Root-level tooling such as `pnpm db:migrate`, `pnpm db:generate`, and `pnpm db:studio` load the repo root `.env` and therefore default to local Postgres as well.

### Start local Postgres

```bash
docker compose up -d postgres
```

### Run local development

```bash
pnpm dev
```

### Run the full stack in Docker

```bash
pnpm dev:docker
```

The default local service URLs are:

- Web: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8787`
- Postgres: `postgres://postgres:postgres@127.0.0.1:5432/daton`

## Render Deployment

The repo now targets Render Blueprints through [`render.yaml`](./render.yaml):

- `daton-web`: Dockerized Next.js standalone server
- `daton-backend`: Dockerized Fastify backend
- `daton-postgres`: Render managed Postgres

Recommended flow:

1. Push the repo to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint from this repo.
3. Provide values for all `sync: false` environment variables.
4. Set `INTERNAL_API_URL` for the web service to the backend's private URL, for example `http://daton-backend:10000`.
5. Add custom domains if you want stable public URLs for `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL`.

### Intentionally target a remote database

Remote databases such as Neon are opt-in only. For one-off commands, pass `DATABASE_URL` explicitly in your shell:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require' pnpm db:migrate
```
