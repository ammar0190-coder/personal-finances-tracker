import { describe, expect, it } from "vitest";
import { computeAccountBalance } from "../balance";
import type { LedgerAccount, LedgerTransaction } from "../types";

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: "tx_1",
    type: "expense",
    accountId: "acc_bank",
    toAccountId: null,
    amount: "100.00",
    date: "2026-01-01",
    linkedTransactionId: null,
    relatedIouEntryId: null,
    ...overrides,
  };
}

const bank: LedgerAccount = {
  id: "acc_bank",
  accountType: "bank",
  isSpendAccount: false,
  isSavings: false,
};

const card: LedgerAccount = {
  id: "acc_card",
  accountType: "credit_card",
  isSpendAccount: false,
  isSavings: false,
};

describe("computeAccountBalance — bank account (PRD §10.1)", () => {
  it("credits: income, transfer-in, iou_repayment, refund", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "income", accountId: "acc_bank", amount: "1000" }),
      tx({ id: "2", type: "transfer", accountId: "acc_other", toAccountId: "acc_bank", amount: "50" }),
      tx({ id: "3", type: "iou_repayment", accountId: "acc_bank", amount: "25" }),
      tx({ id: "4", type: "refund", accountId: "acc_bank", amount: "10" }),
    ];
    expect(computeAccountBalance(bank, txns).toString()).toBe("1085");
  });

  it("debits: expense, transfer-out, investment, iou_settlement", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", accountId: "acc_bank", amount: "100" }),
      tx({ id: "2", type: "transfer", accountId: "acc_bank", toAccountId: "acc_other", amount: "50" }),
      tx({ id: "3", type: "investment", accountId: "acc_bank", amount: "200" }),
      tx({ id: "4", type: "iou_settlement", accountId: "acc_bank", amount: "30" }),
    ];
    expect(computeAccountBalance(bank, txns).toString()).toBe("-380");
  });

  it("ignores transactions belonging to a different account entirely", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "income", accountId: "acc_other", amount: "500" }),
    ];
    expect(computeAccountBalance(bank, txns).toString()).toBe("0");
  });

  it("a transfer only credits the destination, and only debits the source — never both", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "transfer", accountId: "acc_bank", toAccountId: "acc_card", amount: "40" }),
    ];
    expect(computeAccountBalance(bank, txns).toString()).toBe("-40");
  });

  it("keeps exact decimal precision — no float drift on repeated fractional amounts", () => {
    const txns: LedgerTransaction[] = Array.from({ length: 10 }, (_, i) =>
      tx({ id: `t${i}`, type: "income", accountId: "acc_bank", amount: "0.10" }),
    );
    // 0.1 * 10 === 1 exactly in decimal arithmetic; a float64 accumulator
    // (0.1 repeatedly added) famously lands on 0.9999999999999999.
    expect(computeAccountBalance(bank, txns).toString()).toBe("1");
  });
});

describe("computeAccountBalance — credit card account, inverted formula (PRD §10.1)", () => {
  it("expense and iou_settlement increase what's owed", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", accountId: "acc_card", amount: "500" }),
      tx({ id: "2", type: "iou_settlement", accountId: "acc_card", amount: "20" }),
    ];
    expect(computeAccountBalance(card, txns).toString()).toBe("520");
  });

  it("a transfer landing on the card (bill payment) reduces what's owed", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", accountId: "acc_card", amount: "500" }),
      tx({ id: "2", type: "transfer", accountId: "acc_bank", toAccountId: "acc_card", amount: "500" }),
    ];
    expect(computeAccountBalance(card, txns).toString()).toBe("0");
  });

  it("a refund credited to the card reduces what's owed, not spendable cash", () => {
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "expense", accountId: "acc_card", amount: "500" }),
      tx({ id: "2", type: "refund", accountId: "acc_card", amount: "120" }),
    ];
    expect(computeAccountBalance(card, txns).toString()).toBe("380");
  });

  it("throws on a transfer sourced FROM a credit card — PRD §10.1/§10.2 define a credit card only as a transfer destination", () => {
    // §10.2's table leaves "effect on account_id" for a credit-card source
    // as "—" (undefined), because the product never offers this flow — a
    // credit card is never a valid spend/transfer-source account. Rather
    // than invent an unspecified formula (a silent, plausible-looking
    // number), this must fail loudly so a bug that ever constructs such a
    // row is caught immediately instead of quietly corrupting a balance.
    // See docs/DECISIONS.md D-1.
    const txns: LedgerTransaction[] = [
      tx({ id: "1", type: "transfer", accountId: "acc_card", toAccountId: "acc_bank", amount: "100" }),
    ];
    expect(() => computeAccountBalance(card, txns)).toThrow(/credit card.*transfer source/i);
  });
});
