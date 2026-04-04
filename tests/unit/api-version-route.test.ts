import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

function mockJsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("/api/version (branch preview)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_VERSION = "release-aaaaaaa";
    process.env.GITHUB_REPO_OWNER = "ByteTrue";
    process.env.GITHUB_REPO_NAME = "claude-code-hub";
    process.env.RELEASE_BRANCH = "release";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_REPO_OWNER;
    delete process.env.GITHUB_REPO_NAME;
    delete process.env.RELEASE_BRANCH;
  });

  test("应在 release HEAD 不同时提示更新", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/commits/release")) {
          return mockJsonResponse({
            sha: "bbbbbbbcccccccccccccccccccccccccccccccccc",
            html_url: "https://github.com/ByteTrue/claude-code-hub/commit/bbbbbbb",
            commit: { committer: { date: "2025-12-21T00:00:00Z" } },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const { GET } = await import("@/app/api/version/route");
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.current).toBe("release-aaaaaaa");
    expect(data.latest).toBe("release-bbbbbbb");
    expect(data.hasUpdate).toBe(true);
    expect(data.releaseUrl).toContain("/compare/aaaaaaa...bbbbbbb");
    expect(data.publishedAt).toBe("2025-12-21T00:00:00Z");
  });

  test("应在 release HEAD 相同时不提示更新", async () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "release-bbbbbbb";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/commits/release")) {
          return mockJsonResponse({
            sha: "bbbbbbbcccccccccccccccccccccccccccccccccc",
            html_url: "https://github.com/ByteTrue/claude-code-hub/commit/bbbbbbb",
            commit: { committer: { date: "2025-12-21T00:00:00Z" } },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const { GET } = await import("@/app/api/version/route");
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.current).toBe("release-bbbbbbb");
    expect(data.latest).toBe("release-bbbbbbb");
    expect(data.hasUpdate).toBe(false);
    expect(data.releaseUrl).toBe("https://github.com/ByteTrue/claude-code-hub/commit/bbbbbbb");
  });
});
