# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Next.js App Router monolith with layered service modules and embedded Hono sub-apps.

**Key Characteristics:**
- Use `src/app/[locale]/` for the web UI and route composition, with auth and locale enforcement handled by `src/proxy.ts` and layout-level session checks in `src/app/[locale]/dashboard/layout.tsx`.
- Use Hono adapters inside Next route handlers for both the public proxy API in `src/app/v1/[...route]/route.ts` and the management API in `src/app/api/actions/[...route]/route.ts`.
- Keep domain logic outside route files: HTTP routes delegate to server actions in `src/actions/*.ts`, services in `src/lib/**`, and persistence modules in `src/repository/*.ts`.

## Layers

**Routing / Entry Layer:**
- Purpose: Accept HTTP requests, apply locale/auth routing, and dispatch to UI pages or API handlers.
- Location: `src/proxy.ts`, `src/app/[locale]/**`, `src/app/api/**`, `src/app/v1/**`, `src/app/v1beta/**`
- Contains: Next.js proxy middleware, App Router layouts/pages, API route handlers, Hono adapters.
- Depends on: `src/i18n/**`, `src/lib/auth.ts`, `src/app/v1/_lib/**`, `src/lib/api/action-adapter-openapi.ts`
- Used by: Browser requests, CLI/API clients, deployment runtime.

**UI Composition Layer:**
- Purpose: Assemble localized server-rendered pages and client components for admin dashboard, settings, and personal usage views.
- Location: `src/app/[locale]/**`, shared UI in `src/components/**`, client providers in `src/app/providers.tsx`
- Contains: Page components, route layouts, dashboard modules, dialogs, forms, reusable UI primitives.
- Depends on: `src/actions/*.ts`, `src/lib/hooks/**`, `src/components/ui/**`, `src/i18n/**`
- Used by: Web UI routes under `src/app/[locale]/dashboard/**`, `src/app/[locale]/settings/**`, `src/app/[locale]/my-usage/**`

**Action / Application Service Layer:**
- Purpose: Implement management and dashboard use cases behind typed server actions.
- Location: `src/actions/*.ts`
- Contains: User, key, provider, statistics, notifications, and other application-level workflows.
- Depends on: `src/repository/*.ts`, `src/lib/**`, `src/drizzle/db.ts`, `src/drizzle/schema.ts`
- Used by: UI components directly and the generated HTTP API in `src/app/api/actions/[...route]/route.ts`

**HTTP Adapter Layer:**
- Purpose: Convert internal actions and proxy services into documented HTTP endpoints.
- Location: `src/lib/api/action-adapter-openapi.ts`, `src/app/api/actions/[...route]/route.ts`, `src/app/v1/[...route]/route.ts`
- Contains: OpenAPI route factory, auth bridging, request schema validation, Hono app registration, proxy endpoint registration.
- Depends on: `@hono/zod-openapi`, `hono`, `src/lib/auth.ts`, `src/actions/*.ts`, `src/app/v1/_lib/proxy-handler.ts`
- Used by: External automation, API docs consumers, Claude/OpenAI/Codex/Gemini-compatible clients.

**Proxy Domain Layer:**
- Purpose: Process `/v1` and `/v1beta` requests through guards, provider selection, forwarding, format conversion, and response normalization.
- Location: `src/app/v1/_lib/proxy/**`, orchestration entry in `src/app/v1/_lib/proxy-handler.ts`
- Contains: `ProxySession`, `GuardPipelineBuilder`, provider resolver, forwarder, response handler, error mapping, endpoint policy.
- Depends on: `src/lib/**`, `src/repository/*.ts`, `src/types/**`
- Used by: `src/app/v1/[...route]/route.ts` and `src/app/v1beta/[...route]/route.ts`

**Business Support Layer:**
- Purpose: Provide reusable infrastructure and domain utilities shared across UI, actions, and proxy flows.
- Location: `src/lib/**`
- Contains: Auth, logger, rate limiting, Redis helpers, circuit breaker, cache, session tracking, validation, config, price sync, cleanup jobs.
- Depends on: `src/repository/*.ts`, `src/drizzle/db.ts`, third-party SDKs.
- Used by: Nearly every higher-level layer.

**Persistence Layer:**
- Purpose: Encapsulate database reads/writes and transform storage records into domain models.
- Location: `src/repository/*.ts`, shared mapping in `src/repository/_shared/**`
- Contains: Repository functions such as `src/repository/user.ts`, `src/repository/key.ts`, `src/repository/provider.ts`, `src/repository/system-config.ts`
- Depends on: `src/drizzle/db.ts`, `src/drizzle/schema.ts`, `src/types/**`
- Used by: `src/actions/*.ts`, `src/lib/**`, startup/instrumentation code.

**Schema / Data Model Layer:**
- Purpose: Define PostgreSQL tables, enums, relations, and typed DB access.
- Location: `src/drizzle/schema.ts`, `src/drizzle/db.ts`
- Contains: Table definitions for users, keys, providers, vendors, logs, notifications, and related indexes.
- Depends on: Drizzle ORM and environment config in `src/lib/config/env.schema`
- Used by: All repository modules.

## Data Flow

**Web UI Request Flow:**

1. `src/proxy.ts` detects locale, skips `/v1` proxy routes, and redirects unauthenticated browser requests to localized login pages.
2. A localized layout such as `src/app/[locale]/layout.tsx` loads messages and providers; protected layouts such as `src/app/[locale]/dashboard/layout.tsx` run `getSession()` from `src/lib/auth.ts`.
3. Pages and client components invoke server actions from `src/actions/*.ts` directly or through generated `/api/actions/*` endpoints.
4. Server actions orchestrate repositories like `src/repository/user.ts` and shared services in `src/lib/**`, then trigger UI cache invalidation with `revalidatePath()`.

**Management API Flow:**

1. `src/app/api/actions/[...route]/route.ts` builds an `OpenAPIHono` app rooted at `/api/actions`.
2. Each endpoint is registered through `createActionRoute()` in `src/lib/api/action-adapter-openapi.ts`, which applies request schema validation, cookie or bearer auth, and role checks.
3. The adapter invokes a matching server action in `src/actions/*.ts` inside `runWithAuthSession()` from `src/lib/auth.ts`.
4. The action reads or writes via repositories in `src/repository/*.ts` and returns a normalized `{ ok, data | error }` payload.

**Proxy Request Flow:**

1. `src/app/v1/[...route]/route.ts` initializes Hono, CORS, model endpoints, and catches all remaining `/v1` traffic with `handleProxyRequest()` from `src/app/v1/_lib/proxy-handler.ts`.
2. `ProxySession.fromContext()` in `src/app/v1/_lib/proxy/session.ts` parses headers, body, endpoint policy, model hints, and request metadata into a mutable request context.
3. `GuardPipelineBuilder.fromSession()` in `src/app/v1/_lib/proxy/guard-pipeline.ts` runs ordered steps such as auth, sensitive word checks, client/model/version checks, session reuse, request filters, rate limits, provider selection, and message context creation.
4. `ProxyForwarder.send()` in `src/app/v1/_lib/proxy/forwarder.ts` calls the upstream provider, and `ProxyResponseHandler.dispatch()` in `src/app/v1/_lib/proxy/response-handler.ts` normalizes the response before returning it to the client.

**State Management:**
- Request state is mostly per-request and explicit: `ProxySession` in `src/app/v1/_lib/proxy/session.ts` is the central mutable context for proxy requests.
- Browser state is mostly client-side cache via React Query in `src/app/providers.tsx` and route-level server rendering.
- Long-lived shared state lives in PostgreSQL via `src/drizzle/schema.ts` and in Redis-backed helpers under `src/lib/redis/**`, `src/lib/session-tracker.ts`, and related modules.

## Key Abstractions

**ProxySession:**
- Purpose: Represent one proxied request and all derived state needed across guards, forwarding, retries, pricing, and logging.
- Examples: `src/app/v1/_lib/proxy/session.ts`, `src/app/v1/_lib/proxy-handler.ts`
- Pattern: Mutable request context object passed through the whole proxy pipeline.

**Guard Pipeline:**
- Purpose: Execute proxy policy checks in a deterministic, configurable order.
- Examples: `src/app/v1/_lib/proxy/guard-pipeline.ts`, `src/app/v1/_lib/proxy/endpoint-policy.ts`
- Pattern: Ordered chain-of-responsibility with early response exit.

**Action Route Adapter:**
- Purpose: Expose server actions as typed REST endpoints without duplicating validation or auth logic.
- Examples: `src/lib/api/action-adapter-openapi.ts`, `src/app/api/actions/[...route]/route.ts`
- Pattern: Adapter/factory that wraps application functions in HTTP and OpenAPI concerns.

**Repository Modules:**
- Purpose: Isolate DB query construction and model transformation from higher-level workflows.
- Examples: `src/repository/user.ts`, `src/repository/key.ts`, `src/repository/provider.ts`
- Pattern: Functional repository layer built on top of Drizzle.

**Localized Route Shell:**
- Purpose: Apply locale validation, metadata generation, translation loading, and shared providers to the whole UI tree.
- Examples: `src/app/[locale]/layout.tsx`, `src/i18n/request.ts`, `src/i18n/routing.ts`
- Pattern: Nested App Router layouts with server-side i18n bootstrap.

**Instrumentation Bootstrap:**
- Purpose: Start background schedulers, warm caches, initialize observability, and register shutdown hooks.
- Examples: `src/instrumentation.ts`
- Pattern: Startup coordinator using Next instrumentation hooks and guarded global singleton flags.

## Entry Points

**Next Request Proxy:**
- Location: `src/proxy.ts`
- Triggers: Every matched browser request outside `/api`, static assets, and Next internals.
- Responsibilities: Locale routing, public path detection, cookie presence check, redirecting to localized login pages, skipping `/v1` bearer-auth proxy routes.

**Localized Root Layout:**
- Location: `src/app/[locale]/layout.tsx`
- Triggers: All localized UI pages.
- Responsibilities: Validate locale, load translation messages, resolve timezone, inject `NextIntlClientProvider`, wrap `AppProviders`, and render shared footer/toasts.

**Dashboard Layout:**
- Location: `src/app/[locale]/dashboard/layout.tsx`
- Triggers: Admin and dashboard-capable user pages.
- Responsibilities: Enforce authenticated session, redirect read-only users to `/my-usage`, and mount dashboard chrome.

**Management API App:**
- Location: `src/app/api/actions/[...route]/route.ts`
- Triggers: Requests to `/api/actions/**`, `/api/actions/docs`, `/api/actions/scalar`, `/api/actions/openapi.json`
- Responsibilities: Register all action-backed endpoints, OpenAPI schemas, auth schemes, docs UIs, and health endpoint.

**Public Proxy API App:**
- Location: `src/app/v1/[...route]/route.ts`
- Triggers: Requests to `/v1/**`
- Responsibilities: Initialize session/sensitive-word subsystems, expose model endpoints, and route compatible API traffic into the proxy handler.

**Version API:**
- Location: `src/app/api/version/route.ts`
- Triggers: Requests to `/api/version`
- Responsibilities: Report current version, query GitHub releases or branch heads, and return update metadata.

**Startup Instrumentation:**
- Location: `src/instrumentation.ts`
- Triggers: Next.js server startup in Node.js runtime.
- Responsibilities: Initialize Langfuse, skip heavy startup in CI, start cleanup and sync schedulers, sync error rules, and register graceful shutdown hooks.

## Error Handling

**Strategy:** Fail early at boundaries, return normalized HTTP payloads for APIs, and centralize proxy-specific failures into typed error builders.

**Patterns:**
- `src/lib/api/action-adapter-openapi.ts` wraps action results into a consistent `{ ok: true|false }` API contract and maps auth/validation/permission failures to standard HTTP statuses.
- `src/app/v1/_lib/proxy-handler.ts` catches proxy errors, delegates to `ProxyErrorHandler` in `src/app/v1/_lib/proxy/error-handler.ts`, and appends session IDs with `src/app/v1/_lib/proxy/error-session-id.ts`.
- Route handlers such as `src/app/api/auth/login/route.ts` and `src/app/api/version/route.ts` log structured errors via `src/lib/logger.ts` and return explicit fallback responses instead of throwing raw exceptions.
- Layout-level auth failures use redirects rather than JSON errors, as shown in `src/app/[locale]/dashboard/layout.tsx`.

## Cross-Cutting Concerns

**Logging:** Structured logging is centralized in `src/lib/logger.ts` and used across routes, actions, proxy modules, and startup code such as `src/instrumentation.ts` and `src/app/v1/_lib/proxy-handler.ts`.

**Validation:** Input validation is done with Zod schemas and OpenAPI route schemas in `src/lib/api/action-adapter-openapi.ts`, domain schemas in `src/lib/validation/schemas.ts`, and request-shape guards inside proxy modules like `src/app/v1/_lib/proxy/session.ts`.

**Authentication:** Browser and management API auth are implemented in `src/lib/auth.ts`, login mutation lives in `src/app/api/auth/login/route.ts`, route gating starts in `src/proxy.ts`, and proxy bearer authentication is enforced inside `src/app/v1/_lib/proxy/auth-guard.ts`.

---

*Architecture analysis: 2026-03-27*