import { Decimal } from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { computeSpendByCategory, type CategorizedTransaction } from "@/lib/ledger/category-spend";
import { computePeriodSpend } from "@/lib/ledger/spend";
import { computeRawSavingsTracked, computeSavingsRate } from "@/lib/ledger/savings";
import { computePeriodIncome } from "@/lib/ledger/income";
import { mapToLedgerTransactions } from "@/lib/data/ledger-mapping";
import { listTransactions } from "@/lib/data/transactions";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";

async function loadCategorizedTransactions(): Promise<CategorizedTransaction[]> {
  const supabase = await createClient();
  const transactions = await listTransactions();
  const { data: iouEntries } = await supabase.from("iou_entries").select("*");
  const { data: groupExpenses } = await supabase.from("group_expenses").select("id, transaction_id");
  const groupExpenseTransactionByEntryId = new Map((groupExpenses ?? []).map((g) => [g.id, g.transaction_id]));
  const ledgerTransactions = mapToLedgerTransactions(transactions, iouEntries ?? [], groupExpenseTransactionByEntryId);
  const categoryById = new Map(transactions.map((t) => [t.id, t.category_id]));
  return ledgerTransactions.map((t) => ({ ...t, categoryId: categoryById.get(t.id) ?? null }));
}

export interface CategoryBreakdownRow {
  categoryId: string;
  name: string;
  amount: string;
  subcategories: Array<{ categoryId: string; name: string; amount: string }>;
}

/** PRD §9: category breakdown for a period, with subcategory drill-down. */
export async function getCategoryBreakdown(periodStart: string, periodEnd: string): Promise<CategoryBreakdownRow[]> {
  const [transactions, categories] = await Promise.all([loadCategorizedTransactions(), listCategories({ kind: "expense" })]);
  const totals = computeSpendByCategory(transactions, periodStart, periodEnd);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    childrenByParent.set(c.parent_id, [...(childrenByParent.get(c.parent_id) ?? []), c]);
  }

  return parents
    .map((parent) => {
      const children = childrenByParent.get(parent.id) ?? [];
      const subcategories = children
        .map((c) => ({ categoryId: c.id, name: c.name, amount: (totals.get(c.id) ?? new Decimal(0)).toString() }))
        .filter((s) => s.amount !== "0");
      const ownAmount = totals.get(parent.id) ?? new Decimal(0);
      const childrenTotal = subcategories.reduce((sum, s) => sum.plus(s.amount), new Decimal(0));
      return {
        categoryId: parent.id,
        name: parent.name,
        amount: ownAmount.plus(childrenTotal).toString(),
        subcategories,
      };
    })
    .filter((row) => row.amount !== "0")
    .sort((a, b) => Number(b.amount) - Number(a.amount));
}

export interface MonthPoint {
  month: string; // YYYY-MM
  spend: string;
}

/** PRD §9 "Trend over time": monthly effective spend, most recent N months. */
export async function getMonthlyTrend(monthsBack = 12): Promise<MonthPoint[]> {
  const transactions = await loadCategorizedTransactions();
  const now = new Date();
  const points: MonthPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const spend = computePeriodSpend(transactions, start, end);
    points.push({ month: `${year}-${String(month).padStart(2, "0")}`, spend: spend.toString() });
  }

  return points;
}

/** PRD §9/§10.5: savings rate for a period. */
export async function getSavingsRateForPeriod(periodStart: string, periodEnd: string): Promise<{ rate: string | null; raw: string }> {
  const [transactions, accounts] = await Promise.all([loadCategorizedTransactions(), listAccounts()]);
  const savingsAccountIds = new Set(accounts.filter((a) => a.is_savings).map((a) => a.id));
  const raw = computeRawSavingsTracked(transactions, savingsAccountIds, periodStart, periodEnd);

  const totalIncome = computePeriodIncome(transactions, periodStart, periodEnd);

  const rate = computeSavingsRate(raw, totalIncome);
  return { rate: rate ? rate.toString() : null, raw: raw.toString() };
}
