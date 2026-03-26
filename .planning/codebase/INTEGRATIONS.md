# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**LLM upstream providers:**
- Anthropic-compatible providers - Core Claude-style proxy traffic routed through `/v1`, with provider metadata and overrides modeled in `src/drizzle/schema.ts`, `src/app/v1/[...route]/route.ts`, and `src/lib/anthropic/provider-overrides.ts`
  - SDK/Client: internal fetch pipeline built on `fetch`/`undici` in `src/app/v1/_lib/proxy-handler.ts` and related proxy modules under `src/app/v1/_lib/`
  - Auth: provider keys are stored in PostgreSQL via tables defined in `src/drizzle/schema.ts`
- OpenAI-compatible providers - Chat completions and response-style proxy support via `src/app/v1/[...route]/route.ts` and provider typing in `src/drizzle/schema.ts`
  - SDK/Client: internal fetch pipeline built on `fetch`/`undici`
  - Auth: provider credentials stored in DB records, not fixed env vars
- Gemini / Gemini CLI providers - Provider auth and overrides handled in `src/app/v1/_lib/gemini/auth.ts`, `src/lib/gemini/provider-overrides.ts`, and `src/actions/providers.ts`
  - SDK/Client: internal fetch pipeline built on `fetch`/`undici`
  - Auth: provider credentials stored in DB records, not fixed env vars
- Codex-style providers - Response API and provider overrides supported under `src/app/v1/[...route]/route.ts` and `src/lib/codex/provider-overrides.ts`
  - SDK/Client: internal fetch pipeline built on `fetch`/`undici`
  - Auth: provider credentials stored in DB records, not fixed env vars

**Observability:**
- Langfuse - Optional trace export for LLM observability initialized at startup in `src/instrumentation.ts` and implemented in `src/lib/langfuse/index.ts`
  - SDK/Client: `@langfuse/client`, `@langfuse/otel`, `@langfuse/tracing`, `@opentelemetry/sdk-node`
  - Auth: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, optional `LANGFUSE_BASE_URL`, `LANGFUSE_SAMPLE_RATE`, `LANGFUSE_DEBUG`

**Project metadata and update checks:**
- GitHub API - Release and branch version checks in `src/app/api/version/route.ts`
  - SDK/Client: built-in `fetch`
  - Auth: optional `GITHUB_TOKEN` or `GH_TOKEN`
- GitHub raw content - Fetches `VERSION` from the configured repository branch in `src/app/api/version/route.ts`
  - SDK/Client: built-in `fetch`
  - Auth: none required
- GitHub repository links - UI/docs link generation in `src/lib/version.ts` and API docs metadata in `src/app/api/actions/[...route]/route.ts`
  - SDK/Client: URL construction only
  - Auth: optional `GITHUB_REPOSITORY`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `RELEASE_BRANCH`

**Cloud-hosted configuration:**
- Claude Code Hub cloud price table - Downloads TOML pricing data from `https://claude-code-hub.app/config/prices-base.toml` in `src/lib/price-sync/cloud-price-table.ts`
  - SDK/Client: built-in `fetch` plus `@iarna/toml`
  - Auth: none

**Notifications:**
- WeChat webhook bots - Outbound notifications supported by `src/lib/webhook/notifier.ts` and target storage in `src/repository/webhook-targets.ts`
  - SDK/Client: built-in `fetch`
  - Auth: per-target webhook URL stored in `webhook_targets` rows from `src/drizzle/schema.ts`
- Feishu webhook bots - Outbound notifications supported by `src/lib/webhook/notifier.ts`
  - SDK/Client: built-in `fetch`
  - Auth: per-target webhook URL stored in DB
- DingTalk webhook bots - Signed webhook notifications implemented in `src/lib/webhook/notifier.ts`
  - SDK/Client: built-in `fetch`
  - Auth: per-target webhook URL and optional `dingtalkSecret` stored in DB
- Telegram bot API - Notifications sent to `https://api.telegram.org/bot.../sendMessage` in `src/lib/webhook/notifier.ts`
  - SDK/Client: built-in `fetch`
  - Auth: per-target `telegramBotToken` and `telegramChatId` stored in DB
- Custom webhooks - Generic JSON delivery with optional custom headers/templates in `src/lib/webhook/types.ts`, `src/lib/webhook/notifier.ts`, and `src/drizzle/schema.ts`
  - SDK/Client: built-in `fetch`
  - Auth: per-target URL and headers stored in DB

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DSN`
  - Client: `postgres` + `drizzle-orm` in `src/drizzle/db.ts`
- Redis
  - Connection: `REDIS_URL`, optional `REDIS_TLS_REJECT_UNAUTHORIZED`
  - Client: `ioredis` in `src/lib/redis/client.ts`

**File Storage:**
- Local filesystem only for app assets, generated standalone output, version file, and migration files in `public/`, `.next/`, `VERSION`, and `drizzle/`

**Caching:**
- Redis-backed caching for rate limits, auth/session state, active sessions, pub/sub invalidation, and other runtime caches in `src/lib/redis/` and `src/lib/session-manager.ts`
- In-process caching also exists for selected services and startup schedulers in `src/instrumentation.ts` and cache modules under `src/lib/cache/`

## Authentication & Identity

**Auth Provider:**
- Custom API key and session authentication
  - Implementation: `ADMIN_TOKEN` env-based admin auth plus database-backed user keys validated in `src/lib/auth.ts`, login flow in `src/app/api/auth/login/route.ts`, and opaque Redis session storage via `src/lib/auth-session-store/redis-session-store.ts`

## Monitoring & Observability

**Error Tracking:**
- Langfuse tracing when configured in `src/lib/langfuse/index.ts`
- No dedicated Sentry-style error tracker detected

**Logs:**
- Structured server logging via the logger used throughout `src/instrumentation.ts`, `src/lib/redis/client.ts`, `src/app/api/auth/login/route.ts`, and other modules under `src/lib/`

## CI/CD & Deployment

**Hosting:**
- Dockerized standalone Next.js server on Node.js 20, built by `Dockerfile`
- Default packaged runtime stack is Docker Compose with `app`, `postgres`, and `redis` in `docker-compose.yaml`
- Container image source is GHCR, referenced as `ghcr.io/ding113/claude-code-hub:latest` in `docker-compose.yaml`

**CI Pipeline:**
- GitHub Actions workflows are present under `.github/workflows/`

## Environment Configuration

**Required env vars:**
- `ADMIN_TOKEN` - admin login secret, used by `src/lib/auth.ts` and documented in `.env.example`
- `DSN` - PostgreSQL connection string, used by `src/drizzle/db.ts` and `drizzle.config.ts`
- `REDIS_URL` - Redis connection URL for rate limiting, session storage, and pub/sub in `src/lib/redis/client.ts`
- `AUTO_MIGRATE` - startup migration toggle used in `src/instrumentation.ts`
- `ENABLE_RATE_LIMIT` - enables Redis-backed rate limiting logic in `src/lib/redis/client.ts` and `src/instrumentation.ts`
- `SESSION_TTL` - session cache/session-store TTL used across auth and session modules
- `SESSION_TOKEN_MODE` - auth token mode used in `src/lib/auth.ts`
- `ENABLE_SECURE_COOKIES` - secure-cookie behavior in `src/lib/auth.ts` and `src/app/api/auth/login/route.ts`
- `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT`, `DB_POOL_CONNECT_TIMEOUT` - PostgreSQL pool tuning in `src/drizzle/db.ts`
- `FETCH_CONNECT_TIMEOUT`, `FETCH_HEADERS_TIMEOUT`, `FETCH_BODY_TIMEOUT` - outbound proxy HTTP timeouts validated in `src/lib/config/env.schema.ts`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` - enable Langfuse tracing in `src/lib/langfuse/index.ts`
- `GITHUB_TOKEN` or `GH_TOKEN` - optional GitHub API auth in `src/app/api/version/route.ts`

**Secrets location:**
- Local secrets are expected in `.env` and environment-specific `.env.*` files referenced by `drizzle.config.ts`; `.env.example` documents variable names only
- Container deployments load secrets through `env_file` and environment variables in `docker-compose.yaml`
- Webhook credentials and provider credentials are persisted in PostgreSQL tables defined in `src/drizzle/schema.ts`

## Webhooks & Callbacks

**Incoming:**
- Not detected as a general inbound third-party webhook receiver
- The app exposes HTTP APIs under `src/app/api/` and proxy routes under `src/app/v1/`, but no dedicated external service callback endpoints are identified for Stripe/GitHub/Slack-style inbound webhooks

**Outgoing:**
- Webhook notifications for circuit breaker alerts, daily leaderboard, cost alerts, and cache-hit-rate alerts are configured in `src/drizzle/schema.ts` and sent by `src/lib/webhook/notifier.ts`
- Version check requests go to GitHub endpoints from `src/app/api/version/route.ts`
- Cloud price sync requests go to `https://claude-code-hub.app/config/prices-base.toml` from `src/lib/price-sync/cloud-price-table.ts`
- Telegram notifications call `https://api.telegram.org` from `src/lib/webhook/notifier.ts`

---

*Integration audit: 2026-03-27*