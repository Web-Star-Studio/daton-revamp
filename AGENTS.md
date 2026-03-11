# Repository Guidelines

## Project Structure & Module Organization
This repo is a `pnpm` workspace. `apps/web` contains the Next.js 16 frontend, with routes in `src/app`, shared UI in `src/components`, and static assets in `public/assets`. `apps/backend` is the Fastify API; keep server wiring in `src/` and HTTP plugins/routes in `src/plugins`. Shared packages live in `packages/auth`, `packages/contracts`, and `packages/db`. End-to-end coverage lives in `tests/e2e`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`. Use `pnpm dev` to run web and backend together, or `pnpm dev:docker` to start web, backend, and Postgres through Docker Compose. Run `pnpm build` for all workspace builds, `pnpm lint` for TypeScript compile checks, and `pnpm typecheck` for workspace type validation. Use `pnpm test:e2e` to run Playwright specs. Database commands are rooted in `packages/db`: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio`.

## Coding Style & Naming Conventions
The codebase is TypeScript-first and uses ESM. Follow the existing 2-space indentation and keep formatting consistent with `pnpm format` (`prettier --check .`). Prefer PascalCase for React component exports, kebab-case for component filenames such as `sign-in-form.tsx`, and lowercase route folders such as `src/app/sign-in`. Put shared types, auth helpers, and schema contracts in workspace packages instead of duplicating them in apps.

## Testing Guidelines
Playwright is the primary automated test layer. Add or update specs under `tests/e2e/*.spec.ts` and name helpers clearly, for example `helpers.ts`. The current workspace packages mostly use placeholder `test` scripts, so contributors should validate changes with `pnpm build`, `pnpm lint`, and `pnpm typecheck` even when no unit tests exist. Playwright bootstraps local backend and web servers from `playwright.config.ts`.

## Commit & Pull Request Guidelines
Recent history favors short imperative commit subjects like `fix backend auth and audit findings` or `harden organization serializer scope`. Keep commits focused and descriptive. Pull requests should explain behavior changes, call out schema or environment-variable updates, link relevant issues, and include screenshots for UI work. CI currently verifies migrations, build, lint, and typecheck on Node 22 with Postgres 16.

## Security & Configuration Tips
Use the example env files as templates: `.env.example`, `.env.backend.example`, and `.env.web.example`. Do not commit secrets. Prefer local Postgres defaults for development unless a task explicitly requires a remote `DATABASE_URL`.
