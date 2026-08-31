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

function sumAmounts(amounts: readonly string[]): Decimal {
  return amounts.reduce((sum: Decimal, a) => sum.plus(a), new Decimal(0));
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
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [accounts, transactions, dueTemplates] = await Promise.all([
    listAccounts(),
    listTransactions(),
    listDueRecurringTemplates(today),
  ]);

  const spendAccount = accounts.find((a) => a.is_spend_account);
  if (!spendAccount) return null;

  const { data: iouEntries } = await supabase.from("iou_entries").select("*");
  const { data: groupExpenses } = await supabase.from("group_expenses").select("id, transaction_id");
  const groupExpenseTransactionByEntryId = new Map((groupExpenses ?? []).map((g) => [g.id, g.transaction_id]));

  const ledgerTransactions = mapToLedgerTransactions(transactions, iouEntries ?? [], groupExpenseTransactionByEntryId);

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
