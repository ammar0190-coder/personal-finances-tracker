import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { toMoneyString } from "../money";

describe("toMoneyString — the PostgREST-numeric-as-float64 round-trip (PRD §11, D-7)", () => {
  // Number.toString() drops insignificant trailing zeros (19.90 -> "19.9"),
  // same as the number itself carries no notion of trailing-zero formatting —
  // that's expected and harmless for arithmetic. What actually matters is
  // VALUE fidelity: the recovered string must feed Decimal to the exact same
  // amount, not literally reproduce "19.90"'s trailing zero. Display
  // formatting (always show 2dp) is a presentation-layer concern, via
  // `.toFixed(2)` at render time, not this function's job.
  it.each([
    ["19.90", 19.9],
    ["0.10", 0.1],
    ["1234567.89", 1234567.89],
    ["100000000000.99", 100000000000.99], // 14 significant digits — numeric(14,2)'s ceiling
    ["0.29", 0.29], // a classically float-lossy value under naive arithmetic
    ["0", 0],
  ])("recovers the exact decimal VALUE %s from the float64 PostgREST hands back", (original, asFloat) => {
    expect(new Decimal(toMoneyString(asFloat)).equals(new Decimal(original))).toBe(true);
  });

  it("passes a string straight through unchanged", () => {
    expect(toMoneyString("42.00")).toBe("42.00");
  });

  it("the recovered string feeds Decimal exactly — this is the property that actually matters", () => {
    // Ten lots of the classic float-lossy 0.10, via the DB round-trip path,
    // must still sum to exactly 1 — not 0.9999999999999999.
    const values = Array.from({ length: 10 }, () => toMoneyString(0.1));
    const sum = values.reduce((acc, v) => acc.plus(v), new Decimal(0));
    expect(sum.toString()).toBe("1");
  });
});
