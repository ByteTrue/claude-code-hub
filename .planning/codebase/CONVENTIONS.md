# Coding Conventions

**Analysis Date:** 2026-03-27

## Naming Patterns

**Files:**
- Use kebab-case for most source files and directories, especially utilities, routes, repositories, and test files, for example `src/lib/utils/error-detection.ts`, `src/app/api/version/route.ts`, and `tests/unit/proxy/proxy-forwarder.test.ts`.
- Use framework-reserved names where required by Next.js and Vitest, such as `src/app/api/version/route.ts`, `src/app/providers.tsx`, `src/proxy.ts`, `tests/setup.ts`, and `vitest.config.ts`.
- Keep `.test.ts` and `.test.tsx` suffixes consistent with the tested surface, with UI tests usually ending in `.test.tsx` such as `tests/unit/login/login-loading-state.test.tsx` and pure logic tests using `.test.ts` such as `tests/unit/version.test.ts`.

**Functions:**
- Use camelCase for functions and helpers, including exported helpers like `compareVersions` in `src/lib/version.ts`, `isNetworkError` in `src/lib/utils/error-detection.ts`, and `getTranslatedNavItems` in `src/app/[locale]/settings/_lib/nav-items.ts`.
- Prefix React hooks with `use`, as in `useServerAction` in `src/lib/hooks/use-server-action.ts`, `use-fullscreen.ts`, and `use-virtualizer.ts` under `src/hooks/`.
- Use verb-first names for operations and predicates, such as `fetchLatestRelease`, `getCurrentVersion`, `buildGitHubHeaders`, `setHiddenColumns`, and `toggleColumn` in `src/app/api/version/route.ts` and `src/lib/column-visibility.ts`.

**Variables:**
- Use camelCase for local variables and parameters, for example `currentParsed`, `latestInfo`, `networkErrorMessage`, and `mockLocalStorage` in `src/lib/version.ts`, `src/lib/hooks/use-server-action.ts`, and `src/lib/column-visibility.test.ts`.
- Use SCREAMING_SNAKE_CASE for exported constants and configuration values, such as `APP_VERSION`, `GITHUB_REPO`, `SETTINGS_NAV_ITEMS`, `TIME_RANGE_OPTIONS`, and `DEFAULT_NETWORK_ERROR` in `src/lib/version.ts`, `src/app/[locale]/settings/_lib/nav-items.ts`, `src/types/statistics.ts`, and `src/lib/hooks/use-server-action.ts`.
- Use descriptive mock variable names in tests, typically `mockXxx`, `xxxMock`, or builder-style names like `buildKey` and `buildUser`, as seen in `tests/unit/login/login-loading-state.test.tsx` and `tests/unit/security/api-key-auth-cache.test.ts`.

**Types:**
- Use PascalCase for interfaces, type aliases, and domain types, for example `ExecuteOptions`, `ExecuteResult`, `TimeRangeConfig`, `SettingsNavItem`, and `GitHubRelease` in `src/lib/hooks/use-server-action.ts`, `src/types/statistics.ts`, `src/app/[locale]/settings/_lib/nav-items.ts`, and `src/app/api/version/route.ts`.
- Use union types for constrained string domains instead of enums, such as `LogLevel` in `src/lib/logger.ts`, `TimeRange` and `RateLimitType` in `src/types/statistics.ts`, and icon-name unions in `src/app/[locale]/settings/_lib/nav-items.ts`.

## Code Style

**Formatting:**
- Use Biome configured in `biome.json` with 2-space indentation, double quotes, semicolons, trailing commas set to `es5`, and a 100-character line width.
- Keep files ASCII-first unless existing literals require otherwise; the codebase contains localized comments and messages, but formatting remains conventional TypeScript and TSX.
- Let Biome organize imports automatically in normal source files; this is enabled in `biome.json` and intentionally disabled for tests under `tests/**` and `*.test.ts(x)`.

**Linting:**
- Use `biome check .` via the `lint` script in `package.json`; use `biome check --write .` via `lint:fix` for autofixes.
- Treat unused imports as errors and unused variables as warnings in source files, per `biome.json`.
- Allow pragmatic exceptions where the codebase needs flexibility: `noExplicitAny`, `noNonNullAssertion`, and several suspicious rules are disabled in `biome.json`, with extra relaxations for `src/components/ui/**` and test files.

## Import Organization

**Order:**
1. Node or platform imports first, for example `node:fs/promises`, `node:path`, `react`, `next/server`, or package imports in `src/app/api/version/route.ts` and `tests/setup.ts`.
2. Internal alias imports next, primarily `@/` and `@messages/`, as seen across `src/app/api/version/route.ts`, `src/lib/hooks/use-server-action.ts`, and `tests/unit/api-version-route.test.ts`.
3. Relative imports last for nearby helpers and configs, such as `./tests/vitest.base` in `vitest.config.ts` and `./types` or `../vitest.base` in test support files.

**Path Aliases:**
- Use `@/*` for `src/*` and `@messages/*` for `messages/*`, defined in `tsconfig.json`.
- Use the same aliases in tests through shared Vitest resolution helpers in `tests/vitest.base.ts`.
- Treat `server-only` as a special alias in tests, redirected to `tests/server-only.mock.ts` by `tests/vitest.base.ts`.

## Error Handling

**Patterns:**
- Prefer narrow helper functions and explicit fallbacks over leaking raw exceptions, as shown by `getSafeErrorMessage` in `src/lib/utils/error-detection.ts` and the fallback messaging in `src/lib/hooks/use-server-action.ts`.
- Wrap external or I/O boundaries in `try/catch`, return safe defaults where possible, and log diagnostic detail separately, as in `readLocalVersionFile` and `getLatestVersionInfo` in `src/app/api/version/route.ts`.
- Use early returns for invalid or terminal conditions, such as `if (!value) return fallback;` in `vitest.config.ts`, `if (!(error instanceof Error)) return false;` in `src/lib/utils/error-detection.ts`, and `if (!result.ok)` branches in `src/lib/hooks/use-server-action.ts`.
- For user-facing flows, never expose `error.message` directly; map to safe fallback text and keep raw error detail for logs only, per `src/lib/hooks/use-server-action.ts` and `src/lib/utils/error-detection.ts`.

## Logging

**Framework:** `pino` with console fallback

**Patterns:**
- Use the shared `logger` from `src/lib/logger.ts` in server-side code instead of direct `console` calls, as seen in `src/app/api/version/route.ts`, `src/proxy.ts`, and multiple files under `src/actions/`.
- Log with a message-first or object-first wrapper; `src/lib/logger.ts` explicitly supports both `logger.info(obj, msg)` and `logger.info(msg, obj)`.
- Reserve direct `console` usage mostly for test setup and client-side debugging wrappers, such as `tests/setup.ts` and `src/lib/hooks/use-server-action.ts`.
- Use level-specific methods (`warn`, `error`, `info`) with contextual objects when handling fallbacks or failures, for example `logger.warn("[Version] Failed to read VERSION file", { ... })` in `src/app/api/version/route.ts`.

## Comments

**When to Comment:**
- Add comments for non-obvious behavior, safety constraints, and compatibility logic rather than narrating obvious code, as in `src/lib/version.ts`, `src/app/api/version/route.ts`, and `tests/setup.ts`.
- Use section-divider comments in configuration-heavy files to group related concerns, especially in `vitest.config.ts`, `tests/vitest.base.ts`, and `tests/setup.ts`.
- Keep inline comments short and purpose-driven, for example compatibility notes in `src/lib/logger.ts` and translation-key notes in `src/types/statistics.ts`.

**JSDoc/TSDoc:**
- Use JSDoc/TSDoc selectively on exported utilities, hooks, and public helpers, such as `compareVersions` in `src/lib/version.ts`, `useServerAction` in `src/lib/hooks/use-server-action.ts`, and logging helpers in `src/lib/logger.ts`.
- Include `@param`, `@returns`, and `@example` when behavior is subtle or API-like; simple internal helpers often rely on types and naming without full docs.

## Function Design

**Size:**
- Prefer small to medium helpers with one responsibility, then compose them in route handlers or service flows, as shown by the helper breakdown in `src/app/api/version/route.ts`.
- Keep complex setup code in dedicated factory or builder helpers for tests, such as `createSession`, `createCodexProvider`, `buildKey`, and `buildUser` in `tests/unit/proxy/proxy-forwarder.test.ts` and `tests/unit/security/api-key-auth-cache.test.ts`.

**Parameters:**
- Use typed object parameters when a function takes multiple related values, for example `createSession({ userAgent, headers })` in `tests/unit/proxy/proxy-forwarder.test.ts` and `createCoverageConfig(opts)` in `tests/vitest.base.ts`.
- Use explicit generics for reusable helpers where caller type inference matters, such as `ExecuteOptions<T>` and `ExecuteResult<T>` in `src/lib/hooks/use-server-action.ts`.

**Return Values:**
- Prefer explicit discriminated result objects over throwing for recoverable flows, such as `ActionResult<T>` usage in `src/lib/hooks/use-server-action.ts` and `{ ok: true | false }` patterns throughout tests and actions.
- Use `null` as the absence marker for lookups or unavailable external data, such as `readLocalVersionFile(): Promise<string | null>` and `getLatestVersionInfo(): Promise<LatestVersionInfo | null>` in `src/app/api/version/route.ts`.

## Module Design

**Exports:**
- Prefer named exports for functions, constants, and types, as seen throughout `src/lib/version.ts`, `src/lib/logger.ts`, `src/types/statistics.ts`, and `src/app/[locale]/settings/_lib/nav-items.ts`.
- Default exports are used mainly for framework entry files and configuration, such as `vitest.config.ts`, `tests/configs/integration.config.ts`, and page components like `src/app/[locale]/login/page` referenced by `tests/unit/login/login-loading-state.test.tsx`.

**Barrel Files:**
- Barrel files are used selectively, not universally. Prefer direct imports to concrete modules unless a local aggregation point already exists, such as `@/lib/redis` consumed in `tests/setup.ts`.
- When adding new code, follow the nearest existing import style in that folder instead of introducing new barrel layers unnecessarily.

---

*Convention analysis: 2026-03-27*
