import { Decimal } from "decimal.js";
import type { LedgerTransaction } from "./types";

/**
 * Raw savings tracked for a period — gross inflow into any `is_savings`
 * account, excluding transfers whose source is itself a savings account
 * (relocation between savings accounts is not new saving). PRD §10.5.
 *
 * Gross, not net of same-period withdrawals — deliberate, see the PRD's own
 * note in §10.5 and the test suite here.
 */
export function computeRawSavingsTracked(
  transactions: readonly LedgerTransaction[],
  savingsAccountIds: ReadonlySet<string>,
  periodStart: string,
  periodEnd: string,
): Decimal {
  let total = new Decimal(0);
  for (const txn of transactions) {
    if (txn.type !== "transfer") continue;
    if (!txn.toAccountId || !savingsAccountIds.has(txn.toAccountId)) continue;
    if (savingsAccountIds.has(txn.accountId)) continue; // savings-to-savings: excluded
    if (txn.date < periodStart || txn.date > periodEnd) continue;
    total = total.plus(txn.amount);
  }
  return total;
}

/**
 * Savings rate = raw savings tracked ÷ total income, for a period. PRD
 * §10.5. Returns `null` for a period with no income rather than dividing by
 * zero — the PRD doesn't specify this edge case, and "undefined this
 * period" is the honest answer, not 0% or an error.
 */
export function computeSavingsRate(
  rawSavingsTracked: string | Decimal,
  totalIncome: string | Decimal,
): Decimal | null {
  const income = new Decimal(totalIncome);
  if (income.isZero()) return null;
  return new Decimal(rawSavingsTracked).dividedBy(income);
}
