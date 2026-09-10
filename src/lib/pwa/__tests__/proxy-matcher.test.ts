/**
 * The auth proxy redirects any unauthenticated request that isn't under
 * /auth to the login page. That is right for pages and wrong for the three
 * files a browser fetches *before* anyone signs in: it would hand back an
 * HTML redirect where a script, a manifest and an offline page belong, and
 * the install prompt would simply never appear — with no error anywhere.
 */
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("auth proxy matcher", () => {
  it.each(["/sw.js", "/manifest.webmanifest", "/offline.html"])(
    "leaves %s alone, so it is served rather than redirected to login",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );

  it.each(["/icons/icon-192.png", "/_next/static/chunks/main.js", "/favicon.ico"])(
    "still skips %s, as it always did",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );

  it.each(["/", "/investments", "/iou", "/reports"])(
    "still guards %s, which needs a real session",
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );
});
