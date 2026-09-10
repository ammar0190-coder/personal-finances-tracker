/**
 * A service worker registered in development caches build output that changes
 * on every keystroke, which shows up as stale pages that survive a reload —
 * an expensive thing to debug and an easy thing to prevent.
 */
import { describe, expect, it } from "vitest";
import { shouldRegisterServiceWorker } from "@/lib/pwa/register";

describe("shouldRegisterServiceWorker", () => {
  it("registers in production, where the caching is the point", () => {
    expect(shouldRegisterServiceWorker("production", true)).toBe(true);
  });

  it("stays out of the way in development", () => {
    expect(shouldRegisterServiceWorker("development", true)).toBe(false);
  });

  it("stays out of the way under test", () => {
    expect(shouldRegisterServiceWorker("test", true)).toBe(false);
  });

  it("does nothing when the browser has no service worker support", () => {
    expect(shouldRegisterServiceWorker("production", false)).toBe(false);
  });
});
