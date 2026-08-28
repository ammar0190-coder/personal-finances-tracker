import { describe, expect, it } from "vitest";
import { computeAvailableToSpend } from "../available";

describe("computeAvailableToSpend (PRD §10.4)", () => {
  it("ceiling + kept-income − spend − earmarked upcoming recurring", () => {
    const result = computeAvailableToSpend({
      transferredIntoSpendAccount: "20000",
      miscIncomeKeptInSpendAccount: "500",
      periodSpend: "8000",
      upcomingRecurringDue: "15000", // rent + gym + wifi not yet posted
    });
    expect(result.toString()).toBe("-2500");
  });

  it("can go negative once spend exceeds the ceiling — this is allowed, not blocked (PRD §10.4)", () => {
    const result = computeAvailableToSpend({
      transferredIntoSpendAccount: "1000",
      miscIncomeKeptInSpendAccount: "0",
      periodSpend: "5000",
      upcomingRecurringDue: "0",
    });
    expect(result.lessThan(0)).toBe(true);
    expect(result.toString()).toBe("-4000");
  });

  it("zero ceiling with no spend yet and nothing earmarked is exactly zero, not an error", () => {
    const result = computeAvailableToSpend({
      transferredIntoSpendAccount: "0",
      miscIncomeKeptInSpendAccount: "0",
      periodSpend: "0",
      upcomingRecurringDue: "0",
    });
    expect(result.toString()).toBe("0");
  });
});
