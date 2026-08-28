import { Decimal } from "decimal.js";

export interface AvailableToSpendInputs {
  /** Amount transferred into the spend account this cycle — the budget ceiling. */
  transferredIntoSpendAccount: string;
  /** Misc income the user chose to keep in the spend account rather than route to savings. */
  miscIncomeKeptInSpendAccount: string;
  /** Total spend so far this cycle — PRD §10.3, computed via computePeriodSpend. */
  periodSpend: string | Decimal;
  /** Upcoming recurring templates due this cycle that haven't posted yet — PRD §5 earmarking. */
  upcomingRecurringDue: string;
}

/**
 * Available to spend for the current budget cycle, on the account(s)
 * flagged `is_spend_account`. PRD §10.4.
 *
 * Deliberately unclamped — it can go negative once spend exceeds the
 * ceiling, and the UI renders that as an over-budget state rather than
 * blocking anything (PRD §10.4, confirmed explicitly during PRD review).
 */
export function computeAvailableToSpend(inputs: AvailableToSpendInputs): Decimal {
  return new Decimal(inputs.transferredIntoSpendAccount)
    .plus(inputs.miscIncomeKeptInSpendAccount)
    .minus(inputs.periodSpend)
    .minus(inputs.upcomingRecurringDue);
}
