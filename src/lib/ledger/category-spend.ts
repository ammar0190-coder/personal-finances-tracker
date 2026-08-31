import { Decimal } from "decimal.js";
import type { LedgerTransaction } from "./types";

export interface CategorizedTransaction extends LedgerTransaction {
  categoryId: string | null;
}

/**
 * Effective spend per category for a period (PRD §9's category breakdown).
 * Same dynamic-shrinking rule as `computePeriodSpend` (§10.3) applied per
 * category: an expense counts against ITS category, a linked refund reduces
 * the ORIGINAL expense's category (attributed by the original transaction,
 * not the refund's own — which usually has no category at all, §11).
 *
 * `iou_settlement` amounts aren't attributed to any category here, unlike
 * the global spend total — Payables have no category (§11's IOU_ENTRIES
 * carries no category_id), so there's nothing to bucket them into.
 */
export function computeSpendByCategory(
  transactions: readonly CategorizedTransaction[],
  periodStart: string,
  periodEnd: string,
): Map<string, Decimal> {
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const inPeriod = (date: string) => date >= periodStart && date <= periodEnd;
  const totals = new Map<string, Decimal>();

  function add(categoryId: string, amount: string, sign: 1 | -1) {
    const current = totals.get(categoryId) ?? new Decimal(0);
    totals.set(categoryId, sign === 1 ? current.plus(amount) : current.minus(amount));
  }

  for (const txn of transactions) {
    if (txn.type === "expense" && txn.categoryId && inPeriod(txn.date)) {
      add(txn.categoryId, txn.amount, 1);
    } else if (txn.type === "iou_repayment" || txn.type === "refund") {
      if (!txn.linkedTransactionId) continue;
      const original = byId.get(txn.linkedTransactionId);
      if (original?.categoryId && inPeriod(original.date)) {
        add(original.categoryId, txn.amount, -1);
      }
    }
  }

  return totals;
}
