import { describe, expect, it } from "vitest";
import { computeIouEntrySettlement } from "../iou";
import type { IouEntry, LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx",
    type: "iou_repayment",
    accountId: "acc_1",
    toAccountId: null,
    amount: "100",
    date: "2026-01-15",
    linkedTransactionId: null,
    relatedIouEntryId: "entry_1",
    ...overrides,
  };
}

function entry(overrides: Partial<IouEntry>): IouEntry {
  return { id: "entry_1", amountOwed: "1000", writtenOff: false, ...overrides };
}

describe("computeIouEntrySettlement (PRD §10.8)", () => {
  it("pending: no linked repayment transactions at all", () => {
    const result = computeIouEntrySettlement(entry({}), []);
    expect(result.amountSettled.toString()).toBe("0");
    expect(result.status).toBe("pending");
  });

  it("partial: some but not all of amount_owed repaid, across multiple repayments", () => {
    const txns = [
      tx({ id: "1", amount: "300" }),
      tx({ id: "2", amount: "200" }),
    ];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000" }), txns);
    expect(result.amountSettled.toString()).toBe("500");
    expect(result.status).toBe("partial");
  });

  it("settled: amount_settled reaches amount_owed exactly", () => {
    const txns = [tx({ id: "1", amount: "1000" })];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000" }), txns);
    expect(result.status).toBe("settled");
  });

  it("settled: an over-repayment still reads as settled, not some fourth state", () => {
    const txns = [tx({ id: "1", amount: "1200" })];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000" }), txns);
    expect(result.amountSettled.toString()).toBe("1200");
    expect(result.status).toBe("settled");
  });

  it("ignores repayment transactions linked to a DIFFERENT entry", () => {
    const txns = [tx({ id: "1", amount: "500", relatedIouEntryId: "entry_OTHER" })];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000" }), txns);
    expect(result.amountSettled.toString()).toBe("0");
    expect(result.status).toBe("pending");
  });

  it("counts both iou_repayment and iou_settlement rows toward the same entry", () => {
    const txns = [
      tx({ id: "1", type: "iou_repayment", amount: "400" }),
      tx({ id: "2", type: "iou_settlement", amount: "600" }),
    ];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000" }), txns);
    expect(result.amountSettled.toString()).toBe("1000");
    expect(result.status).toBe("settled");
  });

  it("written_off is sticky — status stays written_off even with zero repayments logged", () => {
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000", writtenOff: true }), []);
    expect(result.status).toBe("written_off");
    expect(result.amountSettled.toString()).toBe("0");
  });

  it("a new repayment against a written-off entry moves status back out, per §10.8", () => {
    const txns = [tx({ id: "1", amount: "200" })];
    const result = computeIouEntrySettlement(entry({ amountOwed: "1000", writtenOff: true }), txns);
    expect(result.status).toBe("partial");
    // The caller is responsible for clearing the `writtenOff` flag itself
    // when this happens — see the doc comment on IouEntry.writtenOff.
  });
});
