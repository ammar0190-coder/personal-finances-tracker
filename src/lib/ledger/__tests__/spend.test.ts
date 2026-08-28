import { describe, expect, it } from "vitest";
import { computePeriodSpend } from "../spend";
import type { LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx",
    type: "expense",
    accountId: "acc_1",
    toAccountId: null,
    amount: "100",
    date: "2026-01-15",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    ...overrides,
  };
}

describe("computePeriodSpend (PRD §10.3)", () => {
  it("sums expense + iou_settlement dated within the period", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", amount: "500", date: "2026-01-05" }),
      tx({ id: "2", type: "iou_settlement", amount: "200", date: "2026-01-20" }),
      tx({ id: "3", type: "expense", amount: "999", date: "2025-12-31" }), // outside period
    ];
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("700");
  });

  it("excludes transfer, investment, and income entirely — never spend", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", amount: "300", date: "2026-01-05" }),
      tx({ id: "2", type: "transfer", amount: "1000", date: "2026-01-05" }),
      tx({ id: "3", type: "investment", amount: "500", date: "2026-01-05" }),
      tx({ id: "4", type: "income", amount: "50000", date: "2026-01-05" }),
    ];
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("300");
  });

  it("a repayment/refund reduces the ORIGINAL transaction's period, not the repayment's own date", () => {
    const txns: LedgerTransaction[] = [
      // ₹3,000 group expense logged in January...
      tx({ id: "orig", type: "expense", amount: "3000", date: "2026-01-10" }),
      // ...₹2,000 repaid back in February.
      tx({
        id: "repay",
        type: "iou_repayment",
        amount: "2000",
        date: "2026-02-15",
        linkedTransactionId: "orig",
      }),
    ];
    // January's effective spend has already shrunk, even though the repayment
    // happened in February — this is the "effective spend can keep shrinking
    // after the fact" behaviour the PRD calls out explicitly.
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("1000");
    // February itself isn't touched by a repayment landing in it — the
    // repayment is not itself spend, positive or negative, in its own period.
    expect(computePeriodSpend(txns, "2026-02-01", "2026-02-28").toString()).toBe("0");
  });

  it("an unlinked refund (no original transaction identified) doesn't reduce any period's spend", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "orig", type: "expense", amount: "1000", date: "2026-01-10" }),
      tx({ id: "refund", type: "refund", amount: "200", date: "2026-01-20", linkedTransactionId: null }),
    ];
    // Per §10.9: an unlinked refund behaves like Misc income — it increases
    // available balance but adjusts no specific category's effective spend.
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("1000");
  });

  it("a full repayment brings effective spend to exactly zero", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "orig", type: "expense", amount: "500", date: "2026-01-10" }),
      tx({
        id: "repay",
        type: "iou_repayment",
        amount: "500",
        date: "2026-01-11",
        linkedTransactionId: "orig",
      }),
    ];
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("0");
  });

  it("is NOT clamped at zero — an over-repayment (or a big refund against a low-spend period) can drive it negative", () => {
    // The PRD specifies no floor here, and no validation anywhere prevents
    // amount_settled from exceeding amount_owed. Clamping would silently
    // hide exactly the kind of data-entry mistake (double-logged repayment)
    // this figure should surface, so this locks in "don't clamp" as a
    // deliberate choice rather than leaving it to be discovered by whichever
    // number looks wrong first. See docs/DECISIONS.md D-2.
    const txns: LedgerTransaction[] = [
      tx({ id: "orig", type: "expense", amount: "500", date: "2026-01-10" }),
      tx({
        id: "repay",
        type: "iou_repayment",
        amount: "700",
        date: "2026-01-11",
        linkedTransactionId: "orig",
      }),
    ];
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("-200");
  });

  it("date range is inclusive on both ends", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", amount: "10", date: "2026-01-01" }),
      tx({ id: "2", type: "expense", amount: "20", date: "2026-01-31" }),
    ];
    expect(computePeriodSpend(txns, "2026-01-01", "2026-01-31").toString()).toBe("30");
  });
});
