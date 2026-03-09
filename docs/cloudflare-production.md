# Deploy em produção na Cloudflare

## Estado atual

- `apps/api` publica como Cloudflare Worker via `wrangler deploy`.
- `apps/web` publica como Cloudflare Worker via OpenNext (`@opennextjs/cloudflare`).
- A API aceita dois modos de conexão com banco:
  - `DATABASE_URL` direto.
  - binding `HYPERDRIVE`, preferível em produção na Cloudflare.

## Pré-requisitos

1. Conta Cloudflare autenticada no `wrangler`.
2. Um PostgreSQL de produção já criado fora da Cloudflare.
3. Um segredo forte para `BETTER_AUTH_SECRET`.

## 1. Criar o Hyperdrive

Se você já tiver uma URL de PostgreSQL de produção, crie o binding assim:

```bash
npx wrangler hyperdrive create daton-db \
  --connection-string "postgres://USER:PASSWORD@HOST:5432/DATABASE" \
  --binding HYPERDRIVE
```

Guarde o `id` retornado. Depois inclua o binding em [`apps/api/wrangler.toml`](/Users/webstar/Documents/projects/daton-revamp/apps/api/wrangler.toml):

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "SEU_HYPERDRIVE_ID"
```

No estado atual deste repositório, o binding já está configurado com o id `98e9bdb789984e62a58043f10f3fd3d2`.

Se você não quiser usar Hyperdrive, a API também funciona com `DATABASE_URL`, mas isso perde o benefício de conexão otimizada da Cloudflare.

## 2. Publicar a API

Suba o segredo primeiro:

```bash
printf '%s' 'SEU_SEGREDO_FORTE' | \
  npx wrangler secret put BETTER_AUTH_SECRET --config apps/api/wrangler.toml
```

Depois publique a API com as variáveis de runtime:

```bash
pnpm deploy:api -- \
  --config apps/api/wrangler.toml \
  --var BETTER_AUTH_URL:https://daton-api.<subdominio>.workers.dev \
  --var NEXT_PUBLIC_APP_URL:https://daton-web.<subdominio>.workers.dev \
  --var NEXT_PUBLIC_API_URL:https://daton-api.<subdominio>.workers.dev \
  --var CORS_ORIGIN:https://daton-web.<subdominio>.workers.dev \
  --var SENTRY_DSN:https://<public-key>@o<org-id>.ingest.sentry.io/<project-id> \
  --var SENTRY_ENVIRONMENT:production \
  --var SENTRY_ORG:SEU_ORG \
  --var SENTRY_PROJECT:daton-api \
  --var SENTRY_TRACES_SAMPLE_RATE:0.1 \
  --var ALLOW_FICTIONAL_CNPJ:false
```

Se optar por não usar Hyperdrive, inclua também:

```bash
  --var DATABASE_URL:postgres://USER:PASSWORD@HOST:5432/DATABASE
```

No primeiro deploy, use a URL `workers.dev` retornada para descobrir o `<subdominio>` da conta.

Os segredos do Sentry devem ser enviados como `secret`, não como `--var`:

```bash
printf '%s' 'SEU_SENTRY_AUTH_TOKEN' | \
  npx wrangler secret put SENTRY_AUTH_TOKEN --config apps/api/wrangler.toml
```

O wrapper de deploy da API define `SENTRY_RELEASE` automaticamente a partir do `git rev-parse HEAD` quando possível, gera um bundle local do Worker, injeta Debug IDs e publica os sourcemaps para o projeto informado antes do deploy real.

## 3. Publicar o frontend

Com a URL final da API definida, publique o `web`.

As variáveis abaixo precisam existir no build do Next e também no Worker publicado. O jeito mais direto no CLI é exportar tudo na mesma linha e repetir como `--var`:

```bash
NEXT_PUBLIC_APP_URL=https://daton-web.<subdominio>.workers.dev \
NEXT_PUBLIC_API_URL=https://daton-api.<subdominio>.workers.dev \
INTERNAL_API_URL=https://daton-api.<subdominio>.workers.dev \
NEXT_PUBLIC_SENTRY_DSN=https://<public-key>@o<org-id>.ingest.sentry.io/<project-id> \
SENTRY_ORG=SEU_ORG \
SENTRY_PROJECT=daton-web \
SENTRY_ENVIRONMENT=production \
SENTRY_TRACES_SAMPLE_RATE=0.1 \
pnpm deploy:web -- \
  --config apps/web/wrangler.jsonc \
  --var NEXT_PUBLIC_APP_URL:https://daton-web.<subdominio>.workers.dev \
  --var NEXT_PUBLIC_API_URL:https://daton-api.<subdominio>.workers.dev \
  --var INTERNAL_API_URL:https://daton-api.<subdominio>.workers.dev \
  --var NEXT_PUBLIC_SENTRY_DSN:https://<public-key>@o<org-id>.ingest.sentry.io/<project-id>
```

O token do build do frontend também deve ser secreto:

```bash
SENTRY_AUTH_TOKEN=SEU_SENTRY_AUTH_TOKEN pnpm deploy:web -- --config apps/web/wrangler.jsonc ...
```

O wrapper do frontend também injeta `SENTRY_RELEASE` automaticamente com o SHA atual, e o plugin do `@sentry/nextjs` faz o upload dos sourcemaps do browser e do servidor durante o build quando `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` estiverem presentes.

## 4. Ordem recomendada

1. Criar/configurar o PostgreSQL de produção.
2. Criar o Hyperdrive.
3. Publicar `api`.
4. Confirmar a URL pública retornada.
5. Publicar `web`.

## Comandos úteis

```bash
pnpm deploy:api
pnpm deploy:web
pnpm deploy:cloudflare
```

## Observações

- `BETTER_AUTH_SECRET` deve ficar em secret, não em `wrangler.toml`.
- Se você passar a configurar variáveis pelo Dashboard, faça deploys posteriores com `--keep-vars`.
- O frontend depende de `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL` corretos no build e no runtime.
- Para diferenciar preview e produção no Sentry, publique com `SENTRY_ENVIRONMENT=preview` nos ambientes não finais.
