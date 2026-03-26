# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```text
claude-code-hub/
├── src/                  # Application source code
├── tests/                # Vitest suites, mocks, and test configs
├── drizzle/              # Generated SQL migrations and migration metadata
├── messages/             # next-intl locale message catalogs
├── public/               # Static assets served by Next.js
├── scripts/              # Maintenance and release scripts
├── docs/                 # Project documentation site content and guides
├── dev/                  # Local development environment helpers
├── data/                 # Bundled project data files
├── .github/              # CI workflows and automation prompts
├── package.json          # Scripts and dependency manifest
├── next.config.ts        # Next.js build/runtime configuration
├── tsconfig.json         # TypeScript compiler configuration and path aliases
├── biome.json            # Formatting and linting rules
├── vitest.config.ts      # Default Vitest configuration
└── src/proxy.ts          # Next.js request proxy middleware entry
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router tree for UI routes and API endpoints.
- Contains: Localized pages under `src/app/[locale]/**`, internal and admin API routes under `src/app/api/**`, and Hono-based proxy apps under `src/app/v1/**` and `src/app/v1beta/**`.
- Key files: `src/app/[locale]/layout.tsx`, `src/app/[locale]/dashboard/layout.tsx`, `src/app/api/actions/[...route]/route.ts`, `src/app/v1/[...route]/route.ts`

**`src/actions/`:**
- Purpose: Server actions that implement application use cases for the UI and management API.
- Contains: Modules such as `src/actions/users.ts`, `src/actions/keys.ts`, `src/actions/providers.ts`, `src/actions/statistics.ts`.
- Key files: `src/actions/types.ts`, `src/actions/users.ts`, `src/actions/provider-endpoints.ts`

**`src/lib/`:**
- Purpose: Shared business logic, infrastructure, adapters, and domain utilities.
- Contains: Auth, config, logger, rate limiting, cache, Redis integration, notification services, price sync, and proxy helpers not tied to pages.
- Key files: `src/lib/auth.ts`, `src/lib/api/action-adapter-openapi.ts`, `src/lib/logger.ts`, `src/lib/circuit-breaker.ts`

**`src/app/v1/_lib/proxy/`:**
- Purpose: Core proxy pipeline implementation for Claude/OpenAI/Codex/Gemini-compatible APIs.
- Contains: Guards, session model, provider selection, forwarder, response handler, error translation, and endpoint policy logic.
- Key files: `src/app/v1/_lib/proxy/session.ts`, `src/app/v1/_lib/proxy/guard-pipeline.ts`, `src/app/v1/_lib/proxy/forwarder.ts`, `src/app/v1/_lib/proxy/response-handler.ts`

**`src/repository/`:**
- Purpose: Data access layer over Drizzle ORM.
- Contains: Query modules per domain plus shared transformers in `src/repository/_shared/**`.
- Key files: `src/repository/user.ts`, `src/repository/key.ts`, `src/repository/provider.ts`, `src/repository/system-config.ts`

**`src/drizzle/`:**
- Purpose: Runtime DB wiring and typed schema definitions.
- Contains: `db.ts` for lazy singleton DB access and `schema.ts` for table definitions.
- Key files: `src/drizzle/db.ts`, `src/drizzle/schema.ts`

**`src/components/`:**
- Purpose: Shared React component library reused across route segments.
- Contains: UI primitives in `src/components/ui/**`, feature-specific shared components in `src/components/customs/**`, form helpers, analytics widgets, loaders.
- Key files: `src/components/ui/*`, `src/components/customs/footer.tsx`, `src/components/error-boundary.tsx`

**`src/i18n/`:**
- Purpose: Locale configuration and routing helpers.
- Contains: Locale list, routing declarations, request config for `next-intl`.
- Key files: `src/i18n/config.ts`, `src/i18n/request.ts`, `src/i18n/routing.ts`

**`src/types/`:**
- Purpose: Shared application types that bridge routes, repositories, and lib modules.
- Contains: Domain types for users, keys, providers, system settings, messages, cache, and related DTOs.
- Key files: `src/types/user.ts`, `src/types/key.ts`, `src/types/provider.ts`

**`tests/`:**
- Purpose: Centralized test support and multi-scope test suites.
- Contains: `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`, shared mocks, and config files.
- Key files: `tests/setup.ts`, `tests/test-utils.ts`, `tests/configs/*.config.ts`

**`drizzle/`:**
- Purpose: Generated migration SQL and migration metadata tracked in git.
- Contains: Many timestamped migration files and Drizzle state artifacts.
- Key files: `drizzle/*.sql`, `drizzle/meta/*`

**`messages/`:**
- Purpose: Translation catalogs for five supported locales.
- Contains: Locale-specific message JSON files consumed by `next-intl`.
- Key files: `messages/zh-CN.json`, `messages/en.json`, `messages/ja.json`

## Key File Locations

**Entry Points:**
- `src/proxy.ts`: Global request proxy for locale routing and coarse auth gating.
- `src/instrumentation.ts`: Startup bootstrap for schedulers, observability, cache warming, and shutdown cleanup.
- `src/app/[locale]/layout.tsx`: Root localized UI shell.
- `src/app/api/actions/[...route]/route.ts`: Management API and OpenAPI docs.
- `src/app/v1/[...route]/route.ts`: Public proxy API entry.
- `src/app/v1beta/[...route]/route.ts`: Beta proxy compatibility entry.

**Configuration:**
- `package.json`: Scripts, runtime dependencies, and toolchain definitions.
- `next.config.ts`: Standalone output, server externals, upload limits, and Next Intl plugin setup.
- `tsconfig.json`: Strict TypeScript settings and path aliases such as `@/*` and `@messages/*`.
- `biome.json`: Formatting and lint rules.
- `drizzle.config.ts`: Drizzle migration configuration.
- `vitest.config.ts`: Default test runner configuration.

**Core Logic:**
- `src/lib/auth.ts`: Web auth, session token modes, and request-scoped auth context.
- `src/lib/api/action-adapter-openapi.ts`: Action-to-HTTP adapter.
- `src/app/v1/_lib/proxy/session.ts`: Proxy request context.
- `src/app/v1/_lib/proxy/guard-pipeline.ts`: Guard orchestration.
- `src/app/v1/_lib/proxy/forwarder.ts`: Upstream request execution.
- `src/repository/user.ts`: Representative repository module for DB access patterns.

**Testing:**
- `tests/unit/**`: Unit coverage for route handlers, libs, and utility behavior.
- `tests/integration/**`: Multi-module integration tests.
- `tests/e2e/**`: End-to-end or higher-level scenario tests.
- `src/**/*.test.ts`: Source-adjacent tests for focused modules such as proxy rectifiers.

## Naming Conventions

**Files:**
- Route files use Next conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts` under `src/app/**`.
- Server action modules use kebab-case plural resource names such as `src/actions/model-prices.ts` and `src/actions/webhook-targets.ts`.
- Repository modules use singular or resource-focused kebab-case names such as `src/repository/user.ts`, `src/repository/provider-endpoints.ts`.
- Proxy modules use descriptive kebab-case based on responsibility, such as `src/app/v1/_lib/proxy/provider-selector.ts` and `src/app/v1/_lib/proxy/error-handler.ts`.
- React component files in feature folders use kebab-case, such as `src/app/[locale]/dashboard/_components/dashboard-header.tsx`.

**Directories:**
- Route segment directories follow App Router semantics, including dynamic segments like `src/app/[locale]/dashboard/sessions/[sessionId]/messages/`.
- Shared private route helpers use underscored folders such as `src/app/[locale]/settings/_lib/` and `src/app/v1/_lib/`.
- Feature-local component directories use `_components` next to route trees, such as `src/app/[locale]/dashboard/_components/`.
- Shared infrastructure directories group by concern, such as `src/lib/redis/`, `src/lib/rate-limit/`, `src/lib/provider-endpoints/`.

## Where to Add New Code

**New Feature:**
- Primary code: Put route-specific UI in the matching `src/app/[locale]/...` segment; put reusable server workflows in `src/actions/*.ts`; put persistent query logic in `src/repository/*.ts`.
- Tests: Add broad behavior tests in `tests/unit/**` or `tests/integration/**`; add source-adjacent tests only when the module already uses that pattern, such as `src/app/v1/_lib/proxy/*.test.ts`.

**New API Endpoint:**
- Management-style endpoint: Add or extend a server action in `src/actions/*.ts`, then expose it through `createActionRoute()` registration in `src/app/api/actions/[...route]/route.ts`.
- Proxy-compatible endpoint: Add Hono route registration in `src/app/v1/[...route]/route.ts` and implement behavior in `src/app/v1/_lib/**`.
- Standalone Next route: Create a dedicated `route.ts` under `src/app/api/**` when the endpoint does not fit the action adapter or proxy model.

**New Component/Module:**
- Implementation: Put route-local components in the nearest `_components` directory under `src/app/[locale]/**`; put broadly reusable primitives in `src/components/**`.

**Utilities:**
- Shared helpers: Put cross-domain helpers in `src/lib/**`; keep domain-specific DB access in `src/repository/**`; keep plain shared types in `src/types/**`.

**Database-backed Domain Change:**
- Schema: Update `src/drizzle/schema.ts`.
- Queries: Update or add repository modules in `src/repository/*.ts`.
- Application orchestration: Update server actions in `src/actions/*.ts` or services in `src/lib/**`.
- Migration output: Generate SQL into `drizzle/` using the project migration workflow.

## Special Directories

**`src/app/[locale]/`:**
- Purpose: Locale-scoped UI tree.
- Generated: No.
- Committed: Yes.

**`src/app/v1/_lib/`:**
- Purpose: Internal proxy-only helpers and adapters.
- Generated: No.
- Committed: Yes.

**`src/repository/_shared/`:**
- Purpose: Shared repository transformers and helpers.
- Generated: No.
- Committed: Yes.

**`src/components/ui/`:**
- Purpose: Shared UI primitives used across dashboard and settings pages.
- Generated: No.
- Committed: Yes.

**`tests/configs/`:**
- Purpose: Specialized Vitest configuration files for targeted test suites and coverage runs.
- Generated: No.
- Committed: Yes.

**`drizzle/`:**
- Purpose: SQL migrations and migration metadata produced by Drizzle tooling.
- Generated: Yes.
- Committed: Yes.

**`messages/`:**
- Purpose: Translation resources loaded by `next-intl`.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-03-27*