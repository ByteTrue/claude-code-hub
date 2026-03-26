# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Runner:**
- Vitest `^4.0.16`
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect`

**Run Commands:**
```bash
bun run test              # Run default unit/API/security suite
bun run test:ui           # Start Vitest UI in watch mode
bun run test:coverage     # Generate overall coverage reports
```

## Test File Organization

**Location:**
- Unit tests live primarily under `tests/unit/`, integration tests under `tests/integration/`, security-focused suites under `tests/security/`, API route tests under `tests/api/`, and e2e-style workflows under `tests/e2e/`.
- Source-adjacent tests are used for isolated modules when it improves locality, for example `src/lib/column-visibility.test.ts` and `src/lib/redis/__tests__/pubsub.test.ts`.

**Naming:**
- Use `*.test.ts` for logic and server tests, `*.test.tsx` for UI and component behavior, and occasionally `*.spec.ts(x)` because the config includes both patterns in `vitest.config.ts`.
- Test file names mirror the module or behavior under test, often with a regression-style suffix describing the scenario, such as `tests/unit/proxy/proxy-forwarder-host-header-fix.test.ts` and `tests/unit/repository/provider-endpoint-742-direct-edit.test.ts`.

**Structure:**
```
tests/
├── unit/           # isolated unit tests and UI behavior tests
├── integration/    # DB, repository, proxy, and multi-module flows
├── security/       # auth, CSRF, session, and header hardening tests
├── api/            # action route and API contract tests
├── e2e/            # end-to-end scenarios against running app APIs
├── configs/        # specialized Vitest configs for scoped coverage
├── setup.ts        # global hooks, env loading, cleanup coordination
└── vitest.base.ts  # shared config factories and alias wiring
```

## Test Structure

**Suite Organization:**
```typescript
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("/api/version (branch preview)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_VERSION = "release-aaaaaaa";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  test("应在 release HEAD 不同时提示更新", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockJsonResponse({ sha: "bbbbbbb" })));
    const { GET } = await import("@/app/api/version/route");
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
```
- This pattern comes directly from `tests/unit/api-version-route.test.ts`.

**Patterns:**
- Use top-level `describe` blocks around a module or workflow, then nested `describe` blocks for function groups or scenarios, as in `src/lib/column-visibility.test.ts` and `tests/unit/security/api-key-auth-cache.test.ts`.
- Reset globals, environment variables, and module state in `beforeEach` and `afterEach`, especially when testing dynamic imports or environment-driven code, as in `tests/unit/api-version-route.test.ts` and `tests/unit/drizzle/db-pool-config.test.ts`.
- Prefer direct `expect` assertions over snapshot-heavy tests; assertions usually target response fields, object structure, DOM text, headers, or mock-call counts.
- Use helper builders to keep test bodies focused on intent, such as `buildKey`, `buildUser`, and `createSession` in `tests/unit/security/api-key-auth-cache.test.ts` and `tests/unit/proxy/proxy-forwarder.test.ts`.

## Mocking

**Framework:** Vitest `vi`

**Patterns:**
```typescript
const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});
```
- This pattern is used in `tests/unit/login/login-loading-state.test.tsx`.

```typescript
vi.mock("@/lib/security/api-key-auth-cache", () => ({
  cacheActiveKey: vi.fn(async () => {}),
  getCachedActiveKey: vi.fn<(keyString: string) => Promise<Key | null>>(),
}));
```
- This repository-level dependency mocking pattern appears in `tests/unit/security/api-key-auth-cache.test.ts`.

```typescript
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/commits/release")) return mockJsonResponse({ sha: "bbbbbbb" });
    throw new Error(`Unexpected fetch: ${url}`);
  })
);
```
- This global boundary stubbing pattern is used in `tests/unit/api-version-route.test.ts`.

**What to Mock:**
- Mock external boundaries and framework APIs: `fetch`, `next/navigation`, `next/headers`, `next-intl`, Redis/pubsub helpers, logger methods, and repository collaborators.
- Mock expensive or environment-sensitive modules before dynamic import when the module reads env state at import time, as seen in `tests/unit/api-version-route.test.ts`, `tests/api/action-adapter-auth-session.unit.test.ts`, and `tests/integration/billing-model-source.test.ts`.
- Use `tests/server-only.mock.ts` to neutralize `server-only` imports in test environments through aliasing in `tests/vitest.base.ts`.

**What NOT to Mock:**
- Do not mock pure utility logic when a direct unit test is possible; modules like `src/lib/version.ts`, `src/lib/utils/currency.ts`, and `src/lib/column-visibility.ts` are tested against real implementations in `tests/unit/version.test.ts`, `tests/unit/lib/utils/currency.test.ts`, and `src/lib/column-visibility.test.ts`.
- Integration and security suites often use real database-backed paths instead of mocking repositories, for example `tests/integration/notification-bindings.test.ts`, `tests/integration/provider-endpoint-regression-742.test.ts`, and `tests/security/session-login-integration.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
function buildKey(overrides?: Partial<Key>): Key {
  return {
    id: 1,
    userId: 10,
    name: "k1",
    key: "sk-test",
    isEnabled: true,
    ...overrides,
  };
}
```
- This builder style is used in `tests/unit/security/api-key-auth-cache.test.ts`.

```typescript
function mockJsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}
```
- This local response fixture pattern is used in `tests/unit/api-version-route.test.ts`.

**Location:**
- Most fixtures are local to the test file as small builders and helper functions.
- Shared cross-suite helpers live under `tests/`, such as `tests/test-utils.ts`, `tests/nextjs.mock.ts`, and e2e helpers under `tests/e2e/_helpers/` referenced by `tests/e2e/api-complete.test.ts` and `tests/e2e/users-keys-complete.test.ts`.

## Coverage

**Requirements:**
- Global coverage thresholds exist in `vitest.config.ts`: 50% lines, 50% functions, 40% branches, and 50% statements.
- Coverage is intentionally scoped by exclusions for integration-heavy modules in `vitest.config.ts`; repository, proxy, Redis, rate-limit, and several heavy modules are excluded from the default global threshold.
- The repository also maintains specialized coverage configs in `tests/configs/*.config.ts` using `createCoverageConfig` from `tests/vitest.base.ts` for focused enforcement on risky areas such as quota, proxy guard pipeline, and session-id handling.

**View Coverage:**
```bash
bun run test:coverage
```

## Test Types

**Unit Tests:**
- Scope: pure utilities, route handlers with mocked boundaries, UI rendering, hooks, and isolated service logic.
- Approach: use `happy-dom` for `.tsx` suites and DOM-dependent tests, and use node-like execution for `.ts` logic under the main config in `vitest.config.ts`.
- Examples: `tests/unit/version.test.ts`, `tests/unit/api-version-route.test.ts`, `tests/unit/login/login-loading-state.test.tsx`, and `src/lib/column-visibility.test.ts`.

**Integration Tests:**
- Scope: repository operations, DB-backed workflows, auth flows, proxy behavior across multiple modules, and action-route end-to-end logic.
- Approach: run through `tests/configs/integration.config.ts` with `environment: "node"`, longer timeouts, shared setup from `tests/setup.ts`, and real DB/Redis coordination when available.
- Examples: `tests/integration/usage-ledger.test.ts`, `tests/integration/notification-bindings.test.ts`, and `tests/integration/auth.test.ts`.

**E2E Tests:**
- Framework: Vitest with dedicated config rather than Playwright or Cypress.
- Scope: workflow-style tests hitting application APIs and authenticated flows via helpers, configured in `tests/configs/e2e.config.ts`.
- Examples: `tests/e2e/api-complete.test.ts`, `tests/e2e/users-keys-complete.test.ts`, and `tests/e2e/notification-settings.test.ts`.

## Common Patterns

**Async Testing:**
```typescript
test("validateApiKeyAndGetUser：缓存未命中时应走 DB join 并写入 auth 缓存", async () => {
  const { validateApiKeyAndGetUser } = await import("@/repository/key");
  const result = await validateApiKeyAndGetUser("sk-db");
  expect(result?.key.key).toBe("sk-db");
  expect(cacheAuthResult).toHaveBeenCalledTimes(1);
});
```
- This dynamic-import-after-mock pattern is used in `tests/unit/security/api-key-auth-cache.test.ts`.

```typescript
await act(async () => {
  root.render(<LoginPage />);
});
```
- UI tests wrap rendering and user-triggered updates in `act`, as shown in `tests/unit/login/login-loading-state.test.tsx`.

**Error Testing:**
```typescript
test("无法解析的版本应 Fail Open（视为相等）", () => {
  expect(compareVersions("dev", "v1.0.0")).toBe(0);
  expect(isVersionLess("dev", "v1.0.0")).toBe(false);
});
```
- Pure utility error-tolerance is asserted directly in `tests/unit/version.test.ts`.

```typescript
test("findActiveKeyByKeyString：VF 判定不存在且 Redis 未命中时应短路返回 null", async () => {
  isDefinitelyNotPresent.mockReturnValueOnce(true);
  getCachedActiveKey.mockResolvedValueOnce(null);
  const { findActiveKeyByKeyString } = await import("@/repository/key");
  await expect(findActiveKeyByKeyString("sk-nonexistent")).resolves.toBeNull();
});
```
- Repository and async failure-path tests prefer `resolves` and explicit null/error assertions, as in `tests/unit/security/api-key-auth-cache.test.ts`.

## Global Test Environment

- `tests/setup.ts` loads `.env.test` first, then `.env`, but the analysis never reads those files directly.
- `tests/setup.ts` enforces non-production execution and checks that `DSN` includes `test` unless `ALLOW_NON_TEST_DB=true` is set.
- `tests/setup.ts` coordinates parallel cleanup through Redis counters so only the last worker deletes test data.
- `vitest.config.ts` enables `mockReset`, `restoreMocks`, and `clearMocks`, so tests can assume clean mock state between files.
- `vitest.config.ts` uses `happy-dom` for TSX projects and node execution for TS suites, while `tests/configs/integration.config.ts` and `tests/configs/e2e.config.ts` force `node` for backend-oriented flows.

---

*Testing analysis: 2026-03-27*
