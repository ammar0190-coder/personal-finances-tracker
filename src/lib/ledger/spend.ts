import { Decimal } from "decimal.js";
import type { LedgerTransaction } from "./types";

/**
 * Total spend for a period. PRD §10.3.
 *
 * = (expense + iou_settlement dated within the period)
 * − (iou_repayment + refund whose LINKED ORIGINAL transaction falls within
 *    the period, regardless of when the repayment/refund itself was logged)
 *
 * `linkedTransactionId` is a caller-resolved pointer to "the original
 * transaction this repayment/refund effectively reduces" — for an
 * `iou_repayment` that's a join through IOU_Entries (via `group_expense_id`
 * or `reimbursed_transaction_id`); for a `refund` it's the direct
 * `refunded_transaction_id`. Resolving that join is the data-access layer's
 * job, not this module's — this stays a flat, pure function over an already
 * -resolved transaction list. An unlinked refund/repayment (linkedTransactionId
 * null) never reduces any period's spend — it behaves like Misc income
 * instead (§10.9).
 */
export function computePeriodSpend(
  transactions: readonly LedgerTransaction[],
  periodStart: string,
  periodEnd: string,
): Decimal {
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const inPeriod = (date: string) => date >= periodStart && date <= periodEnd;

  let total = new Decimal(0);

  for (const txn of transactions) {
    switch (txn.type) {
      case "expense":
      case "iou_settlement":
        if (inPeriod(txn.date)) total = total.plus(txn.amount);
        break;
      case "iou_repayment":
      case "refund": {
        if (!txn.linkedTransactionId) break;
        const original = byId.get(txn.linkedTransactionId);
        if (original && inPeriod(original.date)) {
          total = total.minus(txn.amount);
        }
        break;
      }
      default:
        break;
    }
  }

  return total;
}
