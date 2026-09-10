/**
 * The service worker holds financial data on a device that may be shared, so
 * what it is allowed to cache is a correctness concern, not a performance one.
 *
 * These tests load the real shipped `public/sw.js` in a sandbox rather than a
 * copy of its logic — a policy that drifts from the deployed file is worthless.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Strategy = "cache-first" | "network-only";

function loadPolicy(): (url: string, mode?: string) => Strategy {
  const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
  const self: Record<string, unknown> = {
    addEventListener() {},
    skipWaiting() {},
    clients: { claim() {} },
    location: { origin: "https://app.example" },
  };
  const context = vm.createContext({ self, URL, caches: undefined, fetch: undefined, console });
  vm.runInContext(source, context);

  const policy = (self as { chooseStrategy?: (url: string, mode?: string) => Strategy }).chooseStrategy;
  if (!policy) throw new Error("public/sw.js does not expose self.chooseStrategy");
  return policy;
}

describe("service worker cache policy", () => {
  const strategyFor = loadPolicy();

  it("caches immutable build assets, which carry no user data", () => {
    expect(strategyFor("https://app.example/_next/static/chunks/main-abc123.js")).toBe("cache-first");
  });

  it("caches the installable shell assets", () => {
    expect(strategyFor("https://app.example/icons/icon-192.png")).toBe("cache-first");
    expect(strategyFor("https://app.example/offline.html")).toBe("cache-first");
    expect(strategyFor("https://app.example/manifest.webmanifest")).toBe("cache-first");
  });

  it("never caches an authenticated page, which would leak one user's balances to the next", () => {
    expect(strategyFor("https://app.example/", "navigate")).toBe("network-only");
    expect(strategyFor("https://app.example/investments", "navigate")).toBe("network-only");
    expect(strategyFor("https://app.example/iou", "navigate")).toBe("network-only");
    expect(strategyFor("https://app.example/reports", "navigate")).toBe("network-only");
  });

  it("treats a navigation as uncacheable even when its path matches a cache-first rule", () => {
    // The paths above are already network-only by default, so they cannot pin
    // the navigate rule. This one can: drop the navigate check and it becomes
    // cache-first via the /icons/ prefix. It stands in for any future shell
    // path that a page route later shadows.
    expect(strategyFor("https://app.example/icons/icon-192.png", "navigate")).toBe("network-only");
    expect(strategyFor("https://app.example/_next/static/chunks/main.js", "navigate")).toBe("network-only");
  });

  it("never caches the auth routes", () => {
    expect(strategyFor("https://app.example/auth/callback")).toBe("network-only");
    expect(strategyFor("https://app.example/auth/login", "navigate")).toBe("network-only");
  });

  it("never caches Supabase API traffic, which is all user data", () => {
    expect(strategyFor("https://hhhqbbulvvymlojyguax.supabase.co/rest/v1/transactions?select=*")).toBe("network-only");
    expect(strategyFor("https://hhhqbbulvvymlojyguax.supabase.co/auth/v1/token")).toBe("network-only");
  });

  it("defaults to network-only for anything it has not been told about", () => {
    expect(strategyFor("https://app.example/some/future/route")).toBe("network-only");
    expect(strategyFor("https://third-party.example/tracker.js")).toBe("network-only");
  });
});
