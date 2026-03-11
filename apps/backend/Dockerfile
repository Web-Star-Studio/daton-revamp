FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY apps/backend apps/backend
COPY packages packages

RUN pnpm --filter @daton/backend build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps ./apps
COPY --from=base /app/packages ./packages

EXPOSE 8787

CMD ["pnpm", "--filter", "@daton/backend", "start"]
