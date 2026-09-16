/**
 * PRD §8's custom date-range picker, on the terms the approved audit set
 * (docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md, D-16).
 *
 * The rule this module exists to encode: the range scopes exactly ONE figure —
 * spend-so-far — and only when the selected window is not the current cycle.
 * Everything else on the Dashboard is a position, a cycle figure, a
 * today-relative figure, or a feed. This function decides which of the two
 * shapes the period block takes; it is deliberately the only place that
 * decision is made.
 *
 * "Default view on open: the current period" (§8) means the current budget
 * cycle, whose bounds come from the spend-account transfer log — never from
 * the picker.
 */
import { describe, expect, it } from "vitest";
import { resolveDashboardRange } from "@/lib/dashboard/range";

const TODAY = "2026-09-16";
const CYCLE_START = "2026-09-01";

describe("resolveDashboardRange", () => {
  it("opens on the current cycle when nothing is selected", () => {
    expect(resolveDashboardRange({}, TODAY, CYCLE_START)).toEqual({
      mode: "cycle",
      start: CYCLE_START,
      end: TODAY,
    });
  });

  it("stays in cycle mode when no cycle has started yet", () => {
    // The burn-down already has a "no cycle yet" shape; the picker must not
    // invent a window to replace it.
    expect(resolveDashboardRange({}, TODAY, null)).toEqual({
      mode: "cycle",
      start: null,
      end: TODAY,
    });
  });

  it("renders a burn-down when the chosen range is exactly the current cycle", () => {
    // §8: "If the range aligns with an actual budget/transfer cycle, it renders
    // as a proper burn-down against that ceiling."
    expect(resolveDashboardRange({ from: CYCLE_START, to: TODAY }, TODAY, CYCLE_START)).toEqual({
      mode: "cycle",
      start: CYCLE_START,
      end: TODAY,
    });
  });

  it("switches to a period window for a range that is not the cycle", () => {
    expect(resolveDashboardRange({ from: "2026-08-01", to: "2026-08-31" }, TODAY, CYCLE_START)).toEqual({
      mode: "custom",
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("treats a window that merely overlaps the cycle as custom", () => {
    // Same start, different end: not the cycle, so no ceiling applies to it.
    expect(resolveDashboardRange({ from: CYCLE_START, to: "2026-09-10" }, TODAY, CYCLE_START).mode).toBe("custom");
  });

  describe("input that cannot be honoured falls back to the cycle", () => {
    it.each([
      ["only a start", { from: "2026-08-01" }],
      ["only an end", { to: "2026-08-31" }],
      ["a malformed date", { from: "last tuesday", to: "2026-08-31" }],
      ["an impossible date", { from: "2026-02-31", to: "2026-08-31" }],
      ["a start after the end", { from: "2026-08-31", to: "2026-08-01" }],
      ["an empty string", { from: "", to: "" }],
    ])("%s", (_case, params) => {
      // Never silently repaired — a swapped or half-guessed window would show
      // a number for a period nobody asked for.
      expect(resolveDashboardRange(params, TODAY, CYCLE_START)).toEqual({
        mode: "cycle",
        start: CYCLE_START,
        end: TODAY,
      });
    });
  });

  it("accepts a single-day window", () => {
    expect(resolveDashboardRange({ from: "2026-08-04", to: "2026-08-04" }, TODAY, CYCLE_START)).toEqual({
      mode: "custom",
      start: "2026-08-04",
      end: "2026-08-04",
    });
  });

  /**
   * The audit's headline, as an assertion: whatever comes back describes a
   * window for the PERIOD BLOCK only. Nothing here is an account, an IOU or a
   * feed bound, and the shape carries no field that could be mistaken for one.
   */
  it("returns only a window and which shape to draw", () => {
    const range = resolveDashboardRange({ from: "2026-08-01", to: "2026-08-31" }, TODAY, CYCLE_START);
    expect(Object.keys(range).sort()).toEqual(["end", "mode", "start"]);
  });
});
