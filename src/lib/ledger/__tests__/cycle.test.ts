import { describe, expect, it } from "vitest";
import { findCurrentCycleStart } from "../cycle";
import type { LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx",
    type: "transfer",
    accountId: "acc_other",
    toAccountId: "acc_spend",
    amount: "1000",
    date: "2026-01-01",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    ...overrides,
  };
}

describe("findCurrentCycleStart (PRD §10.11 budget cycles)", () => {
  it("null when no transfer into the spend account has ever happened", () => {
    expect(findCurrentCycleStart([], "acc_spend")).toBeNull();
  });

  it("the date of the only transfer in, when there's exactly one", () => {
    const txns = [tx({ date: "2026-01-05" })];
    expect(findCurrentCycleStart(txns, "acc_spend")).toBe("2026-01-05");
  });

  it("the MOST RECENT transfer-in date when there have been several — each one starts a new cycle", () => {
    const txns = [tx({ id: "1", date: "2026-01-01" }), tx({ id: "2", date: "2026-02-01" }), tx({ id: "3", date: "2026-01-15" })];
    expect(findCurrentCycleStart(txns, "acc_spend")).toBe("2026-02-01");
  });

  it("ignores transfers into a different account", () => {
    const txns = [tx({ toAccountId: "acc_other_2", date: "2026-03-01" })];
    expect(findCurrentCycleStart(txns, "acc_spend")).toBeNull();
  });

  it("ignores non-transfer transactions even if they touch the spend account", () => {
    const txns = [tx({ type: "income", toAccountId: null, accountId: "acc_spend", date: "2026-03-01" })];
    expect(findCurrentCycleStart(txns, "acc_spend")).toBeNull();
  });
});
