/**
 * Regression: `--font-sans: var(--font-sans)` in the Tailwind theme is a
 * self-reference, which the browser treats as invalid, so every page fell back
 * to the default serif font. Each theme font token must resolve, possibly via
 * other theme tokens, to a CSS variable that next/font defines in layout.tsx.
 * The browser-level check (the computed font really is Geist) is in
 * tests/e2e.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appDir = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(appDir, "globals.css"), "utf8");
const layout = readFileSync(path.join(appDir, "layout.tsx"), "utf8");

const themeBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1] ?? "";
const themeFonts = new Map(
  [...themeBlock.matchAll(/(--font-[\w-]+):\s*var\((--[\w-]+)\)/g)].map((m) => [m[1], m[2]] as const),
);
const nextFontVariables = new Set([...layout.matchAll(/variable:\s*"(--[\w-]+)"/g)].map((m) => m[1]));

function resolve(token: string, seen: string[] = []): string {
  if (seen.includes(token)) throw new Error(`cycle: ${[...seen, token].join(" -> ")}`);
  const next = themeFonts.get(token);
  return next === undefined ? token : resolve(next, [...seen, token]);
}

describe("theme font tokens", () => {
  it("parses the theme and layout (guards against the test silently checking nothing)", () => {
    expect([...themeFonts.keys()]).toEqual(expect.arrayContaining(["--font-sans", "--font-mono", "--font-heading"]));
    expect(nextFontVariables).toEqual(new Set(["--font-geist-sans", "--font-geist-mono"]));
  });

  it.each(["--font-sans", "--font-mono", "--font-heading"])("%s resolves to a next/font variable", (token) => {
    expect(nextFontVariables).toContain(resolve(token));
  });

  it("sans and heading use Geist Sans, mono uses Geist Mono", () => {
    expect(resolve("--font-sans")).toBe("--font-geist-sans");
    expect(resolve("--font-heading")).toBe("--font-geist-sans");
    expect(resolve("--font-mono")).toBe("--font-geist-mono");
  });
});
