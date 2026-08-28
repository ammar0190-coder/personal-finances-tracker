import { describe, expect, it } from "vitest";
import { computeRawSavingsTracked, computeSavingsRate } from "../savings";
import type { LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx",
    type: "transfer",
    accountId: "acc_spend",
    toAccountId: "acc_savings",
    amount: "100",
    date: "2026-01-15",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    ...overrides,
  };
}

describe("computeRawSavingsTracked (PRD §10.5)", () => {
  it("sums transfers landing in a savings account, dated within the period", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", amount: "5000", date: "2026-01-05" }),
      tx({ id: "2", amount: "3000", date: "2026-01-20" }),
      tx({ id: "3", amount: "9999", date: "2025-12-31" }), // outside period
    ];
    const result = computeRawSavingsTracked(txns, new Set(["acc_savings"]), "2026-01-01", "2026-01-31");
    expect(result.toString()).toBe("8000");
  });

  it("excludes a transfer whose SOURCE is itself a savings account — relocation, not new saving", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", accountId: "acc_savings_2", toAccountId: "acc_savings", amount: "1000" }),
      tx({ id: "2", accountId: "acc_spend", toAccountId: "acc_savings", amount: "500" }),
    ];
    const savingsIds = new Set(["acc_savings", "acc_savings_2"]);
    const result = computeRawSavingsTracked(txns, savingsIds, "2026-01-01", "2026-01-31");
    expect(result.toString()).toBe("500");
  });

  it("is gross inflow only — a same-period withdrawal FROM savings is not netted against it", () => {
    // PRD §10.5, added after review: pulling money back out later the same
    // month doesn't retroactively reduce this figure; it just isn't counted
    // as an inflow in the first place (the withdrawal transfer's destination
    // isn't a savings account, so it never enters this sum at all).
    const txns: LedgerTransaction[] = [
      tx({ id: "in", accountId: "acc_spend", toAccountId: "acc_savings", amount: "10000", date: "2026-01-02" }),
      tx({ id: "out", accountId: "acc_savings", toAccountId: "acc_spend", amount: "10000", date: "2026-01-20" }),
    ];
    const result = computeRawSavingsTracked(txns, new Set(["acc_savings"]), "2026-01-01", "2026-01-31");
    expect(result.toString()).toBe("10000");
  });

  it("ignores non-transfer transaction types entirely", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "income", accountId: "acc_savings", toAccountId: null, amount: "999" }),
    ];
    const result = computeRawSavingsTracked(txns, new Set(["acc_savings"]), "2026-01-01", "2026-01-31");
    expect(result.toString()).toBe("0");
  });
});

describe("computeSavingsRate (PRD §10.5)", () => {
  it("raw savings tracked ÷ total income for the period", () => {
    expect(computeSavingsRate("1800", "10000")?.toString()).toBe("0.18");
  });

  it("returns null rather than dividing by zero when there was no income in the period", () => {
    expect(computeSavingsRate("500", "0")).toBeNull();
  });
});
