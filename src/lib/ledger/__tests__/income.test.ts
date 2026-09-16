/**
 * Total income for a period.
 *
 * This is an EXTRACTION, not new money math: the identical filter already
 * lived inline in `getSavingsRateForPeriod` (src/lib/data/reports.ts) as the
 * denominator of PRD §10.5's savings rate. M8c's date-range control needs the
 * same number for a custom window, and a second copy is exactly the drift that
 * produced D-19 — so the one copy moved here and both callers use it.
 *
 * Behaviour is deliberately unchanged, including the part that looks like an
 * omission: §10.9 says an UNLINKED refund "behaves like Misc income", but the
 * savings-rate denominator has only ever counted `type === "income"`. Folding
 * §10.9 in here would silently change the savings rate, which is not M8c's to
 * change. The tests below pin that down rather than leaving it to be
 * "tidied up" later.
 */
import { describe, expect, it } from "vitest";
import { computePeriodIncome } from "../income";
import type { LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx",
    type: "income",
    accountId: "acc_1",
    toAccountId: null,
    amount: "100",
    date: "2026-01-15",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    ...overrides,
  };
}

describe("computePeriodIncome", () => {
  it("sums income dated within the period", () => {
    const txns = [
      tx({ id: "1", amount: "50000", date: "2026-01-05" }),
      tx({ id: "2", amount: "2500", date: "2026-01-20" }),
    ];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("52500");
  });

  it("ignores income outside the period", () => {
    const txns = [
      tx({ id: "1", amount: "50000", date: "2025-12-31" }),
      tx({ id: "2", amount: "2500", date: "2026-02-01" }),
    ];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("0");
  });

  it("includes both boundary dates", () => {
    const txns = [
      tx({ id: "1", amount: "100", date: "2026-01-01" }),
      tx({ id: "2", amount: "100", date: "2026-01-31" }),
    ];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("200");
  });

  it("counts no other transaction type as income", () => {
    // A transfer in particular is neither income nor spend (§10.6); an
    // investment contribution is outside spend (§10.7) and is not income either.
    const txns = [
      tx({ id: "1", amount: "1000" }),
      tx({ id: "2", type: "transfer", amount: "9999", toAccountId: "acc_2" }),
      tx({ id: "3", type: "investment", amount: "9999" }),
      tx({ id: "4", type: "expense", amount: "9999" }),
      tx({ id: "5", type: "iou_repayment", amount: "9999" }),
      tx({ id: "6", type: "iou_settlement", amount: "9999" }),
    ];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("1000");
  });

  it("does not treat an unlinked refund as income (§10.9 is not folded in here)", () => {
    // Changing this would move the savings rate. See the file comment.
    const txns = [tx({ id: "1", type: "refund", amount: "400", linkedTransactionId: null })];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("0");
  });

  it("adds decimals exactly, with no float drift", () => {
    const txns = [
      tx({ id: "1", amount: "0.1", date: "2026-01-02" }),
      tx({ id: "2", amount: "0.2", date: "2026-01-03" }),
    ];
    expect(computePeriodIncome(txns, "2026-01-01", "2026-01-31").toString()).toBe("0.3");
  });

  it("is zero for a period with no income at all", () => {
    expect(computePeriodIncome([], "2026-01-01", "2026-01-31").toString()).toBe("0");
  });
});
