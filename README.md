# Daton Revamp

## Architecture

- `apps/web` runs the Next.js user-facing application.
- `apps/backend` is the Node/Fastify API that backs the Next.js BFF routes.
- `packages/contracts`, `packages/auth`, and `packages/db` remain shared workspace packages.
- Clerk is the authentication provider; Daton keeps organizations, memberships, and RBAC in Postgres.
- Production targets Render with two Docker web services (`web` and `backend`) and a Neon `DATABASE_URL`.

## Local Development Database

Local development defaults to the `DATABASE_URL` from the repo root `.env`. The intended default is a dedicated Neon database or Neon branch.

- `pnpm dev` starts `@daton/backend` and `@daton/web`.
- `pnpm dev:docker` keeps a local Postgres container available as a fallback, but it no longer overrides `DATABASE_URL` if you already point at Neon.
- Root-level tooling such as `pnpm db:migrate`, `pnpm db:generate`, and `pnpm db:studio` load the repo root `.env` directly and therefore use Neon by default.

### Optional local Postgres fallback

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
- Database: `DATABASE_URL` from `.env` (recommended: Neon)

## Render Deployment

The repo now targets Render Blueprints through [`render.yaml`](./render.yaml):

- `daton-web`: Dockerized Next.js standalone server
- `daton-backend`: Dockerized Fastify backend
- `DATABASE_URL`: regular Render environment variable pointing at Neon

Recommended flow:

1. Push the repo to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint from this repo.
3. Provide values for all `sync: false` environment variables, including `DATABASE_URL`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
4. Set `INTERNAL_API_URL` for the web service to the backend's private URL, for example `http://daton-backend:10000`.
5. Add custom domains if you want stable public URLs for `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL`.
