import { computeIouEntrySettlement } from "@/lib/ledger/iou";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerTransaction } from "@/lib/ledger/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Recomputes one IOU_Entries row's `amount_settled`/`status` from its
 * linked transactions — PRD §10.8. Never called to *set* a value directly;
 * every action that creates, edits, or deletes an `iou_repayment` /
 * `iou_settlement` transaction calls this afterward instead. This is what
 * keeps editing/deleting a repayment safe (CLAUDE.md, ledger-check item 2).
 */
export async function recomputeIouEntry(supabase: SupabaseClient<Database>, entryId: string): Promise<void> {
  const { data: entry, error: entryError } = await supabase.from("iou_entries").select("*").eq("id", entryId).single();
  if (entryError) throw entryError;

  const { data: linkedTxns, error: txnError } = await supabase
    .from("transactions")
    .select("*")
    .eq("related_iou_entry_id", entryId);
  if (txnError) throw txnError;

  const ledgerTransactions: LedgerTransaction[] = linkedTxns.map((t) => ({
    id: t.id,
    type: t.type,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    amount: toMoneyString(t.amount),
    date: t.date,
    linkedTransactionId: null,
    relatedIouEntryId: t.related_iou_entry_id,
  }));

  const { amountSettled, status } = computeIouEntrySettlement(
    { id: entry.id, amountOwed: toMoneyString(entry.amount_owed), writtenOff: entry.status === "written_off" },
    ledgerTransactions,
  );

  const { error: updateError } = await supabase
    .from("iou_entries")
    .update({ amount_settled: amountSettled.toString() as unknown as number, status })
    .eq("id", entryId);
  if (updateError) throw updateError;
}
