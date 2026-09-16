import { Decimal } from "decimal.js";
import type { LedgerTransaction } from "./types";

/**
 * Total income for a period — the denominator of PRD §10.5's savings rate,
 * and the income figure the Dashboard's date-range control shows for a
 * non-cycle window (§8, D-16).
 *
 * Extracted from `getSavingsRateForPeriod`, which held the only copy inline.
 * Behaviour is unchanged: `type === "income"` dated within the window,
 * inclusive of both bounds.
 *
 * §10.9's "an unlinked refund behaves like Misc income" is deliberately NOT
 * folded in — this filter has only ever counted `income`, and widening it here
 * would move the savings rate. That is not the date-range control's to change.
 */
export function computePeriodIncome(
  transactions: readonly LedgerTransaction[],
  periodStart: string,
  periodEnd: string,
): Decimal {
  let total = new Decimal(0);
  for (const txn of transactions) {
    if (txn.type !== "income") continue;
    if (txn.date < periodStart || txn.date > periodEnd) continue;
    total = total.plus(txn.amount);
  }
  return total;
}
