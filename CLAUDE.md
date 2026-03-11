# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daton is an organization/HR management platform. pnpm monorepo deploying to Render with a Fastify backend and Next.js web app.

## Monorepo Layout

- **apps/backend** — Fastify REST API (port 8787)
- **apps/web** — Next.js 16 frontend (port 3000)
- **packages/auth** — WorkOS integration, JOSE JWT session encryption, session snapshot resolution
- **packages/db** — Drizzle ORM schemas (PostgreSQL), migrations, and client
- **packages/contracts** — Shared Zod schemas, enums (roles, statuses), and TypeScript types

## Commands

```bash
# Development
pnpm dev                  # Runs Backend (8787) and Web (3000) concurrently
pnpm dev:docker           # Docker Compose with Postgres, Backend, Web

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
pnpm test:e2e             # Playwright E2E tests (Chromium, against localhost:3000)

# Docker management
pnpm dev:docker:logs      # View Docker Compose logs
pnpm dev:docker:down      # Stop Docker Compose services
pnpm dev:docker:reset     # Reset Docker environment
```

## Architecture

### Backend (Fastify)

Entry point: `apps/backend/src/server.ts`. Fastify plugins are registered from `apps/backend/src/app.ts`. Native route plugins under `apps/backend/src/plugins/api/` expose:
- `/api/v1/bootstrap/*` — Organization creation
- `/api/v1/branches/*` and `/api/v1/members` — Branch and member APIs
- `/api/v1/*` — Session, organization, notifications, departments, employees, positions

Request context setup resolves DB services, WorkOS access, and `SessionSnapshot` before `/api/v1/*` handlers execute. Auth middleware: `requireSession` (validates session) and `requireRoles` (checks RBAC). All state changes are logged via `recordAuditEvent()`. Errors use `AppHttpError` with status codes. Validation errors are translated to Portuguese.

### Web (Next.js 16)

Server-side API calls use `lib/server-api.ts` (server actions) and `lib/api-proxy.ts` (same-origin proxy). Client-side calls use `lib/api.ts` with Zod response validation.

### Auth

WorkOS-based SSO authentication. Sessions are JOSE-encrypted JWTs stored in a `daton-session` cookie (7-day default lifetime). Cross-subdomain cookies via `COOKIE_DOMAIN` env var. The `packages/auth` module handles WorkOS organization/user bootstrapping, access token verification via JWKS, and session snapshot resolution (user, organization, member, effective roles, branch scope). Key functions: `bootstrapOrganizationWithWorkOs()`, `verifyWorkOsAccessToken()`, `createWorkOsClient()`.

### Database

PostgreSQL with Drizzle ORM. Two schema files in `packages/db/src/`: `schema.ts` (domain: organizations, branches, departments, employees, positions, member role assignments) and `auth-schema.ts` (auth tables: user, session, account, verification). Migrations in `packages/db/drizzle/`.

Role-based access control: owner, admin, hr_admin, branch_manager, document_controller, collaborator, viewer. Roles can be global or branch-scoped.

### Deployment

The current production target is Render (configured in `render.yaml`). The backend is built from `apps/backend/Dockerfile` (health check: `/health/ready`), and the web app is built from `apps/web/Dockerfile` (standalone output). Both use Node 22 bookworm-slim base images.

## Environment Setup

Copy `.env.example` to `.env` at the repo root. Key variables:
- `DATABASE_URL` — Local default: `postgres://postgres:postgres@127.0.0.1:5432/daton`
- `DATON_SESSION_SECRET` — Min 32 characters, used for JOSE session encryption
- `WORKOS_API_KEY` / `WORKOS_CLIENT_ID` — WorkOS credentials for auth
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` — Public URLs for web and API
- `INTERNAL_API_URL` — Server-side API URL (can differ from public)
- `ALLOW_FICTIONAL_CNPJ` — Set `true` for dev/test to bypass CNPJ validation

Backend and web env vars live in the repo root `.env` for local development and in Render service settings for production.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push to main and PRs: `pnpm install` → `db:migrate` → `build` → `lint` → `typecheck`. Uses Postgres 16 service container. Node 22, pnpm 10.30.3.

## Key Conventions

- All packages use ESM (`"type": "module"`)
- TypeScript strict mode, ES2022 target
- Zod 4 for validation (request/response schemas live in `packages/contracts`)
- CNPJ formatting and validation is a core domain concept (Brazilian tax ID)
- Sentry integration in both Backend and Web for error tracking
