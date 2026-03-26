# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**Oversized action and proxy modules:**
- Issue: Core workflows are concentrated in very large files, which mixes authorization, validation, orchestration, logging, transport, and fallback logic in single modules.
- Files: `src/actions/providers.ts`, `src/actions/users.ts`, `src/app/v1/_lib/proxy/forwarder.ts`, `src/app/v1/_lib/proxy/response-handler.ts`, `src/lib/session-manager.ts`
- Impact: Changes have high regression risk, review cost is high, and unrelated fixes are likely to conflict in the same file.
- Fix approach: Split by responsibility first, not by line count. Extract narrow services such as provider CRUD orchestration, endpoint selection, retry policy, session persistence, and response accounting into separately tested modules.

**Startup instrumentation owns too many production responsibilities:**
- Issue: Application boot runs migrations, backfills, cache warmup, schedulers, price sync, error-rule sync, queue startup, and shutdown hooks from a single entrypoint.
- Files: `src/instrumentation.ts`, `src/lib/migrate.ts`, `src/repository/provider-endpoints.ts`
- Impact: Startup behavior is hard to reason about, partial failures are easy to miss, and local/dev/prod behavior diverges in multiple branches.
- Fix approach: Isolate boot tasks into explicit startup stages with per-task health reporting, move one-off repair/backfill jobs behind admin commands or dedicated maintenance tasks, and keep `register()` limited to wiring.

**Legacy compatibility paths are still embedded in hot code paths:**
- Issue: Core auth, session, notification, and provider flows still carry legacy/dual/compatibility branches that keep old storage formats and old API semantics alive.
- Files: `src/lib/auth.ts`, `src/lib/session-manager.ts`, `src/lib/notification/notification-queue.ts`, `src/app/api/actions/[...route]/route.ts`, `src/app/v1/_lib/proxy/forwarder.ts`
- Impact: Every new change must preserve multiple modes, which increases branching, hidden behavior differences, and migration drag.
- Fix approach: Define deprecation targets for legacy session tokens, legacy Redis session keys, and legacy notification/provider modes; add migration telemetry; then remove compatibility code once usage drops.

**Typed boundaries are weakened in dynamic API and repository mapping layers:**
- Issue: Some generic adapters and row mappers still rely on broad `any` or weakly typed object handling.
- Files: `src/lib/api/action-adapter-openapi.ts`, `src/repository/provider-endpoints.ts`
- Impact: Refactors can silently break runtime contracts, especially in OpenAPI generation and DB row mapping.
- Fix approach: Replace `any`-based adapters with typed generics around action input/output shapes and convert repository mapping helpers to `unknown` plus explicit parsing.

## Known Bugs

**Opaque session authentication becomes O(number of keys for a user):**
- Symptoms: In opaque session mode, each request loads a user's key list and re-hashes keys until one fingerprint matches the stored session fingerprint.
- Files: `src/lib/auth.ts`, `src/lib/auth-session-store/redis-session-store.ts`
- Trigger: Any authenticated request using `SESSION_TOKEN_MODE=opaque` or `dual` after an opaque session is created.
- Workaround: Use `legacy` token mode to avoid the lookup path, or keep user key counts small until a fingerprint index exists.

**Login availability depends on Redis readiness in opaque mode:**
- Symptoms: Web login returns `503 SESSION_CREATE_FAILED` when Redis is unavailable, even if DB auth itself succeeds.
- Files: `src/app/api/auth/login/route.ts`, `src/lib/auth-session-store/redis-session-store.ts`, `src/lib/redis/client.ts`
- Trigger: `SESSION_TOKEN_MODE=opaque` with Redis unavailable or not yet `ready`.
- Workaround: Use `legacy` session mode temporarily or restore Redis before allowing login traffic.

**Session message existence checks can degrade on large Redis keyspaces:**
- Symptoms: Session-related reads may become slower because the implementation scans Redis keys for `session:{id}:req:*:messages`.
- Files: `src/lib/session-manager.ts`
- Trigger: Calling `SessionManager.hasAnySessionMessages()` in environments with many session keys.
- Workaround: Keep Redis TTLs short and avoid relying on broad session introspection features under heavy load.

**GLM MCP client does not classify provider-specific API failures yet:**
- Symptoms: Non-2xx GLM responses are surfaced as generic request errors without vendor-specific parsing or actionable categorization.
- Files: `src/lib/mcp/glm-client.ts`
- Trigger: Any GLM MCP upstream error response that needs structured handling.
- Workaround: Inspect raw HTTP status and logs; no code-level provider-specific fallback is implemented.

## Security Considerations

**Bearer token fallback accepts raw long-lived secrets on HTTP APIs:**
- Risk: API consumers can authenticate by sending raw API keys or admin tokens in `Authorization: Bearer`, which enlarges the blast radius of token leakage and keeps long-lived credentials on every request.
- Files: `src/lib/auth.ts`, `src/app/api/actions/[...route]/route.ts`
- Current mitigation: Constant-time comparison is used for admin token checks, and auth cookies remain the primary Web UI path.
- Recommendations: Prefer opaque session tokens for browser/API auth, restrict raw admin token fallback to explicitly internal endpoints, and add audit logging plus an opt-out flag for bearer key auth.

**Redis TLS verification can be disabled by environment flag:**
- Risk: Setting `REDIS_TLS_REJECT_UNAUTHORIZED=false` permits man-in-the-middle exposure on `rediss://` connections.
- Files: `src/lib/redis/client.ts`, `src/lib/log-cleanup/cleanup-queue.ts`, `src/lib/notification/notification-queue.ts`
- Current mitigation: TLS is enabled automatically for `rediss://`, and the flag is opt-in.
- Recommendations: Treat disabled verification as production-invalid, emit a startup error in production, and document it as a local-debug-only escape hatch.

**Sensitive session payloads are intentionally persisted when configured:**
- Risk: Session request/response bodies can be stored in Redis, and a config switch allows raw message content persistence instead of redacted storage.
- Files: `src/lib/session-manager.ts`, `src/lib/config/env.schema.ts`
- Current mitigation: Redaction is the default path and storage can be disabled with env flags.
- Recommendations: Default production profiles should keep body storage minimized, add explicit size and retention limits per key type, and surface a startup warning whenever raw message storage is enabled.

## Performance Bottlenecks

**Per-request opaque session reconstruction is DB- and CPU-heavy:**
- Problem: Opaque session validation re-hashes every key returned by `findKeyList(sessionData.userId)` until it finds a fingerprint match.
- Files: `src/lib/auth.ts`
- Cause: Session storage keeps only a fingerprint, but the lookup path has no fingerprint-to-key index or direct DB query.
- Improvement path: Store key ID alongside the fingerprint in the opaque session payload, or add a repository query by fingerprint hash so validation becomes O(1).

**Endpoint probing schedules frequent database polling and distributed lock churn:**
- Problem: Probe scheduling wakes frequently, renews leadership, polls DB, shuffles endpoints, and fans out probe work from the app process.
- Files: `src/lib/provider-endpoints/probe-scheduler.ts`, `src/lib/provider-endpoints/leader-lock.ts`, `src/repository/provider-endpoints.ts`
- Cause: The scheduler is implemented as an in-process timer loop with lock keepalive and repeated due-time checks.
- Improvement path: Move probing to a dedicated worker/queue, persist next-run timestamps, and reduce full-table polling in the request-serving process.

**Large in-process startup workflows extend cold start and restart time:**
- Problem: The server performs migrations, backfills, seed checks, warmups, and scheduler startup during boot.
- Files: `src/instrumentation.ts`, `src/lib/migrate.ts`, `src/repository/provider-endpoints.ts`, `src/lib/price-sync/seed-initializer.ts`
- Cause: Maintenance and application boot are coupled.
- Improvement path: Separate mandatory startup checks from optional maintenance jobs and run repair/backfill tasks out-of-band.

## Fragile Areas

**Provider endpoint synchronization is concurrency-sensitive:**
- Files: `src/repository/provider-endpoints.ts`, `src/repository/provider.ts`, `tests/integration/provider-endpoint-sync-race.test.ts`, `tests/integration/provider-endpoint-regression-742.test.ts`
- Why fragile: The code already carries race-condition and sibling-endpoint regression tests, which indicates endpoint create/update/delete behavior has had locking and visibility bugs.
- Safe modification: Preserve transaction boundaries, unique conflict handling, and soft-delete semantics; add integration coverage for any new edit path before changing vendor or endpoint sync logic.
- Test coverage: There is targeted integration coverage for known regressions, but the area still depends on DB-backed tests that are skipped unless `DSN` is configured.

**Proxy routing and fallback behavior depend on layered compatibility rules:**
- Files: `src/app/v1/_lib/proxy/forwarder.ts`, `src/app/v1/_lib/proxy/provider-selector.ts`, `src/app/v1/_lib/proxy/response-handler.ts`
- Why fragile: Strict endpoint policy, legacy provider URL fallback, retry limits, vendor-type circuit breaking, and format rectifiers all interact in the same request path.
- Safe modification: Change one decision layer at a time and add focused tests around endpoint exhaustion, retry truncation, and cross-provider fallback behavior.
- Test coverage: This area has many unit tests under `tests/unit/proxy/`, but its core runtime is still concentrated in multi-thousand-line files.

**Session persistence logic mixes Redis fallback, privacy controls, and compatibility reads:**
- Files: `src/lib/session-manager.ts`, `src/lib/auth-session-store/redis-session-store.ts`, `src/lib/auth.ts`
- Why fragile: The implementation mixes multiple storage formats, Redis readiness fallbacks, privacy toggles, and auth/session behaviors across browser and proxy flows.
- Safe modification: Avoid changing storage keys and auth mode semantics together; introduce new storage contracts in parallel and migrate behind tests.
- Test coverage: Coverage exists for session contracts in `tests/security/session-contract.test.ts` and related files, but `src/lib/session-manager.ts` is excluded from global coverage in `vitest.config.ts`.

## Scaling Limits

**Single-process timers own background jobs:**
- Current capacity: One app instance can run migrations, cleanup, notification scheduling, cloud price sync, endpoint probing, and cache invalidation hooks from `src/instrumentation.ts`.
- Limit: Horizontal scaling depends on advisory locks and best-effort leader election; duplicate work and delayed ownership transfer become more likely as instance count grows.
- Scaling path: Move background workloads to dedicated workers or queue consumers with explicit leases and observability.

**Provider and session hot paths are still memory/process local:**
- Current capacity: Request handling relies on in-process caches, timers, and large orchestration modules such as `src/app/v1/_lib/proxy/forwarder.ts` and `src/lib/session-manager.ts`.
- Limit: Restart churn, hot reload, or multi-instance deployments can produce cache warmup gaps, repeated initialization, and uneven behavior.
- Scaling path: Externalize more coordination state, reduce module side effects at import time, and keep request-serving code stateless wherever possible.

## Dependencies at Risk

**Bull in development mode:**
- Risk: Notification queue support is disabled in development because Bull is incompatible with the current Turbopack-based dev flow.
- Impact: Notification features cannot be validated locally under the default dev mode, which increases drift between development and production behavior.
- Migration plan: Move notification background processing to a dev-compatible worker path, or run Bull in an isolated worker process outside the Next.js dev server.

## Missing Critical Features

**No active replacement for skipped Actions API end-to-end coverage:**
- Problem: Major Actions API suites are marked `describe.skip` with comments saying they need refactoring into integration tests.
- Blocks: Safe refactoring of user, provider, and key management HTTP contracts in `src/app/api/actions/[...route]/route.ts`.

**No direct index for opaque session fingerprint lookup:**
- Problem: Session auth reconstructs identity by scanning a user's keys rather than looking up a stable key identifier.
- Blocks: Efficient scaling of opaque sessions for users with many keys and predictable auth latency under load.

## Test Coverage Gaps

**Actions API contract coverage is intentionally skipped:**
- What's not tested: End-to-end behavior for user, provider, and key Actions API modules.
- Files: `tests/api/users-actions.test.ts`, `tests/api/providers-actions.test.ts`, `tests/api/keys-actions.test.ts`, `src/app/api/actions/[...route]/route.ts`
- Risk: HTTP contract regressions, auth behavior changes, and serialization differences can ship without a failing test.
- Priority: High

**Heavy core modules are excluded from global coverage thresholds:**
- What's not tested: Important runtime modules are explicitly excluded from coverage accounting, including session, circuit breaker, proxy, repository, notification, and rate-limit code.
- Files: `vitest.config.ts`, `src/lib/session-manager.ts`, `src/lib/circuit-breaker.ts`, `src/app/v1/_lib/**`, `src/repository/**`, `src/lib/rate-limit/**`, `src/lib/notification/**`
- Risk: Global coverage metrics understate the amount of critical behavior that is effectively unmeasured.
- Priority: High

**DB-backed integration tests are environment-gated:**
- What's not tested: Concurrency and regression coverage for provider endpoint synchronization only runs when `DSN` is configured.
- Files: `tests/integration/provider-endpoint-sync-race.test.ts`, `tests/integration/provider-endpoint-regression-742.test.ts`, `tests/integration/provider-endpoint-index-and-repair.test.ts`
- Risk: CI or local runs without DB configuration can miss real persistence-layer regressions in a historically fragile area.
- Priority: Medium

**Session manager hot path lacks proportional coverage:**
- What's not tested: Redis fallback behavior, key scanning behavior, storage compatibility reads, and privacy-toggle interactions in the full `SessionManager` implementation.
- Files: `src/lib/session-manager.ts`, `vitest.config.ts`
- Risk: Refactors in session persistence can break observability, privacy, or request tracking without affecting headline coverage.
- Priority: Medium

---

*Concerns audit: 2026-03-27*
