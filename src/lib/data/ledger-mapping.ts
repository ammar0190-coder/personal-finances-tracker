import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerTransaction } from "@/lib/ledger/types";
import type { Transaction } from "@/lib/data/transactions";
import type { Database } from "@/types/database";

type IouEntry = Database["public"]["Tables"]["iou_entries"]["Row"];

/**
 * Maps DB transaction rows into the ledger's pure shape, resolving
 * `linkedTransactionId` — "the original transaction this repayment/refund
 * effectively reduces" (PRD §10.3) — through the join `computePeriodSpend`
 * deliberately doesn't know how to do itself (see the doc comment on
 * `LedgerTransaction.linkedTransactionId`).
 *
 * For a `refund`, the link is direct (`refunded_transaction_id`). For an
 * `iou_repayment`, it's a join through `IOU_Entries`: a Group Expense
 * receivable resolves to `group_expense_id`'s transaction; a reimbursement
 * resolves directly to `reimbursed_transaction_id`. No IOU UI exists yet
 * (M4), so `iouEntries`/`groupExpenseTransactionByEntryId` are typically
 * empty — this is written to be correct once that module lands, not
 * exercised by real data yet.
 */
export function mapToLedgerTransactions(
  transactions: readonly Transaction[],
  iouEntries: readonly IouEntry[],
  groupExpenseTransactionByEntryId: ReadonlyMap<string, string>,
): LedgerTransaction[] {
  const entryById = new Map(iouEntries.map((e) => [e.id, e]));

  return transactions.map((t) => {
    let linkedTransactionId: string | null = null;
    if (t.type === "refund") {
      linkedTransactionId = t.refunded_transaction_id;
    } else if (t.type === "iou_repayment" && t.related_iou_entry_id) {
      const entry = entryById.get(t.related_iou_entry_id);
      if (entry?.reimbursed_transaction_id) {
        linkedTransactionId = entry.reimbursed_transaction_id;
      } else if (entry?.group_expense_id) {
        linkedTransactionId = groupExpenseTransactionByEntryId.get(entry.group_expense_id) ?? null;
      }
    }

    return {
      id: t.id,
      type: t.type,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      amount: toMoneyString(t.amount),
      date: t.date,
      linkedTransactionId,
      relatedIouEntryId: t.related_iou_entry_id,
    };
  });
}
