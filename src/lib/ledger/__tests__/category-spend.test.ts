import { describe, expect, it } from "vitest";
import { computeSpendByCategory } from "../category-spend";
import type { CategorizedTransaction } from "../category-spend";

function tx(overrides: Partial<CategorizedTransaction>): CategorizedTransaction {
  return {
    id: "tx",
    type: "expense",
    accountId: "acc_1",
    toAccountId: null,
    amount: "100",
    date: "2026-01-15",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    categoryId: "cat_food",
    ...overrides,
  };
}

describe("computeSpendByCategory (PRD §9 category breakdown)", () => {
  it("sums expense amounts per category within the period", () => {
    const txns = [
      tx({ id: "1", categoryId: "cat_food", amount: "300" }),
      tx({ id: "2", categoryId: "cat_food", amount: "150" }),
      tx({ id: "3", categoryId: "cat_travel", amount: "500" }),
    ];
    const result = computeSpendByCategory(txns, "2026-01-01", "2026-01-31");
    expect(result.get("cat_food")?.toString()).toBe("450");
    expect(result.get("cat_travel")?.toString()).toBe("500");
  });

  it("excludes transactions outside the period", () => {
    const txns = [tx({ id: "1", categoryId: "cat_food", date: "2025-12-31", amount: "999" })];
    const result = computeSpendByCategory(txns, "2026-01-01", "2026-01-31");
    expect(result.has("cat_food")).toBe(false);
  });

  it("a refund linked to an expense reduces that category's effective spend, even when the refund itself is dated later (PRD §10.3)", () => {
    const txns = [
      tx({ id: "orig", categoryId: "cat_food", amount: "1000", date: "2026-01-10" }),
      tx({ id: "refund", type: "refund", categoryId: null, amount: "300", date: "2026-02-05", linkedTransactionId: "orig" }),
    ];
    // January's category breakdown, viewed any time after the refund lands,
    // shows the shrunken figure — this is the M6 exit test's core behavior.
    const result = computeSpendByCategory(txns, "2026-01-01", "2026-01-31");
    expect(result.get("cat_food")?.toString()).toBe("700");
  });

  it("ignores non-expense, non-iou_settlement transaction types entirely", () => {
    const txns = [tx({ id: "1", type: "transfer", categoryId: null, amount: "5000" })];
    const result = computeSpendByCategory(txns, "2026-01-01", "2026-01-31");
    expect(result.size).toBe(0);
  });
});
