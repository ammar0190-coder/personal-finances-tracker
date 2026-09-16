/**
 * M8 §1.2–§1.4: the dark theme is the primary one, and brand colour must never
 * be confusable with data colour on the same screen — otherwise the Reports
 * page shows a series in the same hue as the active-tab accent and the reader
 * cannot tell which is which.
 *
 * Colours are declared in two notations (oklch for UI tokens, hex for chart
 * series), so everything is converted to OKLCH here before being compared.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "..", "globals.css"), "utf8");

/**
 * The rule block for `selector`, matched at the start of a line — `.dark` also
 * appears inside `@custom-variant dark (&:is(.dark *))` near the top of the
 * file, and a plain indexOf finds that instead.
 */
function block(selector: string): Map<string, string> {
  const start = css.search(new RegExp(`^\\${selector}\\s*\\{`, "m"));
  if (start === -1) throw new Error(`no rule block for ${selector}`);
  const source = css.slice(start);
  const body = source.slice(source.indexOf("{") + 1, source.indexOf("\n}"));
  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()] as const));
}

interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** sRGB hex → OKLCH, per the Oklab specification. */
function hexToOklch(hex: string): Oklch {
  const n = parseInt(hex.replace("#", ""), 16);
  const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return { l: lightness, c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}

function parse(value: string): Oklch {
  if (value.startsWith("#")) return hexToOklch(value);
  const m = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`unparsable colour: ${value}`);
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

/** Shortest distance between two hues on the colour wheel, in degrees. */
function hueGap(a: Oklch, b: Oklch): number {
  const d = Math.abs(a.h - b.h) % 360;
  return d > 180 ? 360 - d : d;
}

const dark = block(".dark");
const chartTokens = [...dark.keys()].filter((k) => /^--chart-\d+$/.test(k));

describe("dark theme colours", () => {
  it("parses the dark block (guards against the test silently checking nothing)", () => {
    expect(dark.get("--primary")).toBeDefined();
    expect(chartTokens.length).toBeGreaterThanOrEqual(5);
    expect(dark.get("--chart-sequential")).toBeDefined();
  });

  it("the background is near-black, not pure black", () => {
    const bg = parse(dark.get("--background")!);
    expect(bg.l).toBeGreaterThan(0.1);
    expect(bg.l).toBeLessThan(0.22);
  });

  it("cards sit a visible step above the page background", () => {
    const bg = parse(dark.get("--background")!);
    const card = parse(dark.get("--card")!);
    expect(card.l).toBeGreaterThan(bg.l);
    expect(card.l - bg.l).toBeLessThan(0.12);
  });

  it("the accent carries real chroma, so it is a hue and not another grey", () => {
    expect(parse(dark.get("--primary")!).c).toBeGreaterThan(0.08);
  });

  it.each(["--chart-sequential"])("%s is not confusable with the brand accent", (token) => {
    const accent = parse(dark.get("--primary")!);
    expect(hueGap(accent, parse(dark.get(token)!))).toBeGreaterThan(40);
  });

  /**
   * M8: dark is the default theme, not an opt-in. The light scale still exists
   * and the toggle that reaches it arrives in M8c; until then the app must not
   * boot into the light theme.
   */
  it("the app boots dark", () => {
    const layout = readFileSync(path.resolve(import.meta.dirname, "..", "layout.tsx"), "utf8");
    const html = layout.slice(layout.indexOf("<html"), layout.indexOf(">", layout.indexOf("<html")));
    expect(html).toMatch(/\bdark\b/);
  });

  it("the over-budget colour is a red, distinct from the accent", () => {
    const destructive = parse(dark.get("--destructive")!);
    expect(hueGap(destructive, parse(dark.get("--primary")!))).toBeGreaterThan(40);
    expect(destructive.h < 60 || destructive.h > 330).toBe(true);
  });
});
