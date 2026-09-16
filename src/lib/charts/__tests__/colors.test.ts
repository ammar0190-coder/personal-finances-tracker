/**
 * Chart colours live twice: as CSS custom properties in globals.css, and as
 * plain hex here because Recharts renders SVG presentation attributes, which do
 * not reliably resolve `var()`. Two copies drift — and they did: the CSS moved
 * the trend line to teal in M8a while this module still said blue, so the
 * rendered line stayed the colour it was supposed to stop being.
 *
 * These tests tie the copies together and hold the M8 chart decisions.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SELECTED_BAR_COLOR, SEQUENTIAL_LINE_COLOR, UNSELECTED_BAR_COLOR } from "@/lib/charts/colors";

const css = readFileSync(path.resolve(import.meta.dirname, "../../../app/globals.css"), "utf8");

function darkToken(name: string): string {
  const start = css.search(/^\.dark\s*\{/m);
  const body = css.slice(start, css.indexOf("\n}", start));
  const m = body.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`no ${name} in the dark theme`);
  return m[1].trim();
}

describe("chart colours", () => {
  it("reads the dark theme (guards against the test silently checking nothing)", () => {
    expect(darkToken("--chart-sequential")).toMatch(/^#/);
  });

  it("keeps the trend line in step with the CSS token", () => {
    expect(SEQUENTIAL_LINE_COLOR.toLowerCase()).toBe(darkToken("--chart-sequential").toLowerCase());
  });

  /**
   * M8 §1.4: spend-by-category plots ONE measure, so rank and length carry the
   * comparison. A hue per category encodes identity that position already
   * states, and competes with the brand accent. One neutral hue, with the
   * accent reserved for the bar being drilled into.
   */
  it("uses one neutral hue for bars and the accent only for the selected one", () => {
    expect(UNSELECTED_BAR_COLOR).not.toBe(SELECTED_BAR_COLOR);
    expect(SELECTED_BAR_COLOR.toLowerCase()).toBe(darkToken("--chart-selected").toLowerCase());
  });

  it("does not export a categorical palette for a single-measure chart", async () => {
    const colors = await import("@/lib/charts/colors");
    expect(colors).not.toHaveProperty("CATEGORICAL_COLORS");
  });
});
