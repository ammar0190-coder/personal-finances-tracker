import { describe, expect, it } from "vitest";
import { computeNextDueDate } from "../recurring";

describe("computeNextDueDate (PRD §10.11)", () => {
  it("monthly: advances by exactly one month", () => {
    expect(computeNextDueDate("2026-01-05", "monthly")).toBe("2026-02-05");
  });

  it("monthly: the 31st falls to the next month's last valid day (Feb has 28 in 2026, not a leap year)", () => {
    expect(computeNextDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("monthly: the 31st in a lead-up to a leap February lands on the 29th", () => {
    expect(computeNextDueDate("2028-01-31", "monthly")).toBe("2028-02-29"); // 2028 is a leap year
  });

  it("monthly: December rolls over into January of the next year", () => {
    expect(computeNextDueDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });

  it("quarterly: advances by exactly three months", () => {
    expect(computeNextDueDate("2026-01-31", "quarterly")).toBe("2026-04-30");
  });

  it("annual: advances by exactly one year, clamping Feb 29 to Feb 28 on a non-leap target year", () => {
    expect(computeNextDueDate("2028-02-29", "annual")).toBe("2029-02-28");
  });

  it("annual: an ordinary date just advances the year, day and month unchanged", () => {
    expect(computeNextDueDate("2026-06-15", "annual")).toBe("2027-06-15");
  });

  it("custom: advances by the given interval in days", () => {
    expect(computeNextDueDate("2026-01-01", "custom", 10)).toBe("2026-01-11");
  });

  it("custom: throws if no interval is given — there is nothing to advance by", () => {
    expect(() => computeNextDueDate("2026-01-01", "custom")).toThrow(/custom.*interval/i);
  });
});
