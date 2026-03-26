# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript - Main application language across `src/`, `tests/`, `next.config.ts`, `drizzle.config.ts`, and `vitest.config.ts`
- SQL - Generated PostgreSQL migrations in `drizzle/` and schema definitions in `src/drizzle/schema.ts`

**Secondary:**
- JavaScript / CommonJS - Build and maintenance scripts in `scripts/` such as `scripts/copy-version-to-standalone.cjs` and `scripts/validate-migrations.js`
- CSS - Tailwind/PostCSS-driven styling configured through `postcss.config.mjs` and component styles under `src/`
- Markdown - Project and deployment docs in `README.md`, `README.en.md`, `CONTRIBUTING.md`, and `CLAUDE.md`

## Runtime

**Environment:**
- Node.js 20+ runtime for production containers, defined in `Dockerfile` and required by `README.md`
- Bun 1.3+ for package management and local development scripts, defined in `package.json` and documented in `README.md`

**Package Manager:**
- Bun - scripts and installs run through `bun` in `package.json`
- Lockfile: present via `bun.lock`

## Frameworks

**Core:**
- Next.js 16.2.1 - App Router web app and route handlers, configured in `package.json` and `next.config.ts`
- React 19 - UI rendering for dashboard and settings screens, declared in `package.json`
- Hono 4 - API routing layer for `/v1` proxy routes and `/api/actions`, used in `src/app/v1/[...route]/route.ts` and `src/app/api/actions/[...route]/route.ts`
- next-intl 4 - Internationalization plugin and navigation, configured in `next.config.ts`, `src/proxy.ts`, and `src/i18n/request.ts`
- Drizzle ORM 0.44 - PostgreSQL ORM and schema layer in `src/drizzle/db.ts` and `src/drizzle/schema.ts`

**Testing:**
- Vitest 4.0.16 - Unit, API, integration, coverage, and UI test runner in `package.json` and `vitest.config.ts`
- happy-dom 20 - Browser-like DOM test environment in `vitest.config.ts`

**Build/Dev:**
- tsgo (`@typescript/native-preview`) - Typecheck/preflight in `package.json`
- Biome 2.4.8 - linting and formatting in `package.json` and `biome.json`
- Tailwind CSS 4 - styling toolchain in `package.json` and `postcss.config.mjs`
- Drizzle Kit 0.31 - schema migration generation and DB tooling in `package.json` and `drizzle.config.ts`
- Docker / Docker Compose - containerized deployment in `Dockerfile` and `docker-compose.yaml`

## Key Dependencies

**Critical:**
- `next` `^16.2.1` - application shell, routing, standalone build output; configured in `next.config.ts`
- `react` `^19` and `react-dom` `^19` - UI runtime for `src/app/` and `src/components/`
- `hono` `^4` - request router for proxy and management APIs in `src/app/v1/[...route]/route.ts` and `src/app/api/actions/[...route]/route.ts`
- `drizzle-orm` `^0.44` with `postgres` `^3` - database access in `src/drizzle/db.ts`
- `ioredis` `^5` - Redis-backed rate limiting, session storage, pub/sub, and caches in `src/lib/redis/client.ts`
- `zod` `^4` - validation and OpenAPI schema generation in `src/lib/config/env.schema.ts` and `src/lib/api/action-adapter-openapi.ts`

**Infrastructure:**
- `@hono/zod-openapi` `^1`, `@hono/swagger-ui` `^0.5`, `@scalar/hono-api-reference` `^0.9` - generated API documentation in `src/app/api/actions/[...route]/route.ts`
- `@langfuse/client`, `@langfuse/otel`, `@langfuse/tracing`, `@opentelemetry/sdk-node` - optional LLM observability in `src/lib/langfuse/index.ts` and `src/instrumentation.ts`
- `bull` `^4`, `@bull-board/api` `^6`, `@bull-board/express` `^6` - background jobs and queue UI support, referenced by `next.config.ts` server externals and queue-related modules under `src/lib/`
- `undici` `^7` and `fetch-socks` `^1.3.2` - outbound HTTP and proxy transport, included in `next.config.ts` tracing output
- `@tanstack/react-query` `^5` - client-side data fetching/cache in `src/app/` and `src/components/`
- `pino` `^10` and `pino-pretty` `^13` - structured logging via `src/lib/logger`
- `@iarna/toml` `^2.2.5` - parsing cloud-hosted price tables in `src/lib/price-sync/cloud-price-table.ts`

## Configuration

**Environment:**
- Environment variables are validated with Zod in `src/lib/config/env.schema.ts`
- Drizzle CLI loads `.env.development.local`, `.env.local`, `.env.development`, and `.env` in priority order via `drizzle.config.ts`
- Example configuration is documented in `.env.example`; secret values are expected in local `.env` files or deployment environment settings
- Core required runtime configuration includes `ADMIN_TOKEN`, `DSN`, and usually `REDIS_URL`, documented in `.env.example` and enforced by `src/lib/config/env.schema.ts`
- Optional observability and GitHub integration require `LANGFUSE_*`, `GITHUB_TOKEN`, or `GH_TOKEN`, used by `src/lib/langfuse/index.ts` and `src/app/api/version/route.ts`

**Build:**
- Next.js build/runtime config: `next.config.ts`
- TypeScript compiler config and path aliases: `tsconfig.json`
- Lint/format config: `biome.json`
- Test config: `vitest.config.ts`
- Database migration config: `drizzle.config.ts`
- Container build config: `Dockerfile` and `docker-compose.yaml`

## Platform Requirements

**Development:**
- Bun 1.3+ and Node.js 20+ for local commands in `README.md` and `package.json`
- PostgreSQL and Redis for full local feature parity; Docker Compose stack provided in `docker-compose.yaml`
- Browser-capable environment for Next.js dashboard pages under `src/app/[locale]/`

**Production:**
- Deployment target is a standalone Next.js server running on Node.js 20-slim, built from `Dockerfile`
- Primary packaged deployment is Docker Compose with `postgres`, `redis`, and `app` services in `docker-compose.yaml`
- Container image distribution is documented via GHCR in `README.md` and uses `ghcr.io/ding113/claude-code-hub:latest` in `docker-compose.yaml`

---

*Stack analysis: 2026-03-27*