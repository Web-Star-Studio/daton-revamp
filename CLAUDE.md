# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daton is an organization/HR management platform. pnpm monorepo deploying to Cloudflare Workers.

## Monorepo Layout

- **apps/api** — Hono REST API on Cloudflare Workers (port 8787)
- **apps/web** — Next.js 16 frontend, deployed via opennextjs-cloudflare (port 3000)
- **packages/auth** — Better Auth config, custom PBKDF2 password hashing with legacy scrypt migration
- **packages/db** — Drizzle ORM schemas (PostgreSQL), migrations, and client
- **packages/contracts** — Shared Zod schemas, enums (roles, statuses), and TypeScript types

## Commands

```bash
# Development
pnpm dev                  # Runs API (8787) and Web (3000) concurrently
pnpm dev:docker           # Docker Compose with Postgres, API, Web

# Build & Quality
pnpm build                # Build all packages
pnpm lint                 # TypeScript type-check across all packages
pnpm typecheck            # Same as lint
pnpm format               # Prettier check

# Database (runs in packages/db)
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio

# Testing
pnpm test:e2e             # Playwright E2E tests (needs API + Web running)

# Deployment
pnpm deploy:api           # Deploy API to Cloudflare Workers
pnpm deploy:web           # Deploy Web to Cloudflare Workers
pnpm deploy:cloudflare    # Deploy both
```

## Architecture

### API (Hono)

Entry point: `apps/api/src/index.ts`. Routes are organized as:
- `/api/auth/*` — Better Auth handler (sign-in, sign-up, session)
- `/api/v1/bootstrap/*` — Organization creation
- `/api/v1/branches/*` — Branch CRUD
- `/api/v1/*` — Organization, members, departments, employees, positions

Middleware chain: CORS → DB connection setup → Auth session extraction (`withSession`). The `withSession` middleware builds a `SessionSnapshot` containing user, organization, member, effective roles, and branch scope.

### Web (Next.js 16)

Server-side API calls use `lib/server-api.ts` (server actions) and `lib/api-proxy.ts` (same-origin proxy). Client-side calls use `lib/api.ts` with Zod response validation.

### Auth

Better Auth with Drizzle adapter. Email/password auth. Sessions last 7 days. Cookie prefix: `daton`. Cross-subdomain cookies via `COOKIE_DOMAIN` env var. Custom PBKDF2-SHA256 password hashing (iterations configurable via `BETTER_AUTH_PASSWORD_HASH_ITERATIONS`) with automatic migration from legacy scrypt hashes on sign-in.

### Database

PostgreSQL with Drizzle ORM. Two schema files in `packages/db/src/`: `schema.ts` (domain: organizations, branches, departments, employees, positions, member role assignments) and `auth-schema.ts` (Better Auth tables). Migrations in `packages/db/drizzle/`.

Role-based access control: owner, admin, hr_admin, branch_manager, document_controller, collaborator, viewer. Roles can be global or branch-scoped.

### Cloudflare Workers

Both apps use Cloudflare Workers. API uses Hyperdrive for database connection pooling. Web uses opennextjs-cloudflare for Next.js deployment. Wrangler configs: `apps/api/wrangler.toml`, `apps/web/wrangler.jsonc`.

## Environment Setup

Copy `.env.example` to `.env` at the repo root. Key variables:
- `DATABASE_URL` — Local default: `postgres://postgres:postgres@127.0.0.1:5432/daton`
- `BETTER_AUTH_SECRET` — Min 32 characters
- `BETTER_AUTH_URL` — API origin (e.g., `http://127.0.0.1:8787`)
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` — Public URLs for web and API
- `INTERNAL_API_URL` — Server-side API URL (can differ from public)
- `ALLOW_FICTIONAL_CNPJ` — Set `true` for dev/test to bypass CNPJ validation

API-specific vars go in `apps/api/.dev.vars` (Wrangler local dev).

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push to main and PRs: `pnpm install` → `db:migrate` → `build` → `lint` → `typecheck`. Uses Postgres 16 service container. Node 22, pnpm 10.30.3.

## Key Conventions

- All packages use ESM (`"type": "module"`)
- TypeScript strict mode, ES2022 target
- Zod 4 for validation (API request/response schemas live in `packages/contracts`)
- CNPJ formatting and validation is a core domain concept (Brazilian tax ID)
- Sentry integration in both API and Web for error tracking
