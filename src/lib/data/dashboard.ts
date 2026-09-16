import { Decimal } from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { findCurrentCycleStart } from "@/lib/ledger/cycle";
import { computePeriodSpend } from "@/lib/ledger/spend";
import { computeAvailableToSpend } from "@/lib/ledger/available";
import { toMoneyString } from "@/lib/ledger/money";
import { mapToLedgerTransactions } from "@/lib/data/ledger-mapping";
import { listAccounts } from "@/lib/data/accounts";
import { listTransactions } from "@/lib/data/transactions";
import { listDueRecurringTemplates } from "@/lib/data/recurring";
import { computePeriodIncome } from "@/lib/ledger/income";
import type { LedgerTransaction } from "@/lib/ledger/types";

function sumAmounts(amounts: readonly string[]): Decimal {
  return amounts.reduce((sum: Decimal, a) => sum.plus(a), new Decimal(0));
}

/**
 * Every transaction, resolved into ledger form. Shared by the two period
 * shapes so they cannot disagree about what a transaction means.
 */
async function loadLedgerTransactions(): Promise<LedgerTransaction[]> {
  const supabase = await createClient();
  const transactions = await listTransactions();
  const { data: iouEntries } = await supabase.from("iou_entries").select("*");
  const { data: groupExpenses } = await supabase.from("group_expenses").select("id, transaction_id");
  const groupExpenseTransactionByEntryId = new Map((groupExpenses ?? []).map((g) => [g.id, g.transaction_id]));
  return mapToLedgerTransactions(transactions, iouEntries ?? [], groupExpenseTransactionByEntryId);
}

export interface PeriodTotals {
  start: string;
  end: string;
  spend: string;
  income: string;
}

/**
 * PRD §8's "raw totals" for a window that is NOT a budget cycle, as the audit
 * settled it (Q3, D-16): spend and income, and nothing else.
 *
 * No ceiling, no earmarking and no available-to-spend, because §10.4's formula
 * needs a cycle to subtract from and there isn't one here. The block changes
 * SHAPE rather than showing the same shape with degraded numbers — blank
 * fields read as "data missing", and a progress bar with no denominator is a
 * lie.
 *
 * Both figures come from the same primitives the rest of the app uses
 * (§10.3's computePeriodSpend, §10.5's income filter), so a window that
 * happens to match a report period agrees with the report.
 */
export async function getPeriodTotals(start: string, end: string): Promise<PeriodTotals> {
  const ledgerTransactions = await loadLedgerTransactions();
  return {
    start,
    end,
    spend: computePeriodSpend(ledgerTransactions, start, end).toString(),
    income: computePeriodIncome(ledgerTransactions, start, end).toString(),
  };
}

export interface BudgetCycle {
  cycleStart: string | null;
  today: string;
  transferredIntoSpendAccount: string;
  miscIncomeKeptInSpendAccount: string;
  periodSpend: string;
  upcomingRecurringDue: string;
  availableToSpend: string | null;
}

/**
 * PRD §10.4's available-to-spend, wired to real data. §10.11: a budget cycle
 * runs from one spend-account transfer to the next; this project's own
 * cycle-boundary assumption is `findCurrentCycleStart` (docs/DECISIONS.md
 * D-8). "Upcoming recurring due" earmarks anything already due (§5) rather
 * than everything ever scheduled — also D-8.
 */
export async function getCurrentBudgetCycle(): Promise<BudgetCycle | null> {
  const today = new Date().toISOString().slice(0, 10);

  const [accounts, dueTemplates] = await Promise.all([listAccounts(), listDueRecurringTemplates(today)]);

  const spendAccount = accounts.find((a) => a.is_spend_account);
  if (!spendAccount) return null;

  const ledgerTransactions = await loadLedgerTransactions();

  const dueTemplateAmounts = dueTemplates.map((t) => toMoneyString(t.amount));
  const upcomingRecurringDue = sumAmounts(dueTemplateAmounts);

  const cycleStart = findCurrentCycleStart(ledgerTransactions, spendAccount.id);
  if (!cycleStart) {
    return {
      cycleStart: null,
      today,
      transferredIntoSpendAccount: "0",
      miscIncomeKeptInSpendAccount: "0",
      periodSpend: "0",
      upcomingRecurringDue: upcomingRecurringDue.toString(),
      availableToSpend: null,
    };
  }

  const transferredIntoSpendAccount = sumAmounts(
    ledgerTransactions
      .filter((t) => t.type === "transfer" && t.toAccountId === spendAccount.id && t.date >= cycleStart && t.date <= today)
      .map((t) => t.amount),
  );

  const miscIncomeKeptInSpendAccount = sumAmounts(
    ledgerTransactions
      .filter((t) => t.type === "income" && t.accountId === spendAccount.id && t.date >= cycleStart && t.date <= today)
      .map((t) => t.amount),
  );

  const periodSpend = computePeriodSpend(ledgerTransactions, cycleStart, today);

  const availableToSpend = computeAvailableToSpend({
    transferredIntoSpendAccount: transferredIntoSpendAccount.toString(),
    miscIncomeKeptInSpendAccount: miscIncomeKeptInSpendAccount.toString(),
    periodSpend,
    upcomingRecurringDue: upcomingRecurringDue.toString(),
  });

  return {
    cycleStart,
    today,
    transferredIntoSpendAccount: transferredIntoSpendAccount.toString(),
    miscIncomeKeptInSpendAccount: miscIncomeKeptInSpendAccount.toString(),
    periodSpend: periodSpend.toString(),
    upcomingRecurringDue: upcomingRecurringDue.toString(),
    availableToSpend: availableToSpend.toString(),
  };
}
