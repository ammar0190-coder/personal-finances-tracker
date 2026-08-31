import { computeAccountBalance } from "@/lib/ledger/balance";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type BalanceSnapshot = Database["public"]["Tables"]["balance_snapshots"]["Row"];

export async function getTrackedBalance(accountId: string): Promise<string> {
  const supabase = await createClient();
  const { data: account, error: accountError } = await supabase.from("accounts").select("*").eq("id", accountId).single();
  if (accountError) throw accountError;
  const { data: transactions, error: txnError } = await supabase.from("transactions").select("*");
  if (txnError) throw txnError;

  const ledgerAccount: LedgerAccount = {
    id: account.id,
    accountType: account.account_type,
    isSpendAccount: account.is_spend_account,
    isSavings: account.is_savings,
  };
  const ledgerTransactions: LedgerTransaction[] = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    amount: toMoneyString(t.amount),
    date: t.date,
    linkedTransactionId: null,
    relatedIouEntryId: t.related_iou_entry_id,
  }));
  return computeAccountBalance(ledgerAccount, ledgerTransactions).toString();
}

export async function getLastSnapshot(accountId: string): Promise<BalanceSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("balance_snapshots")
    .select("*")
    .eq("account_id", accountId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** PRD §3: the transaction log since the last reconciliation, for the >₹500 manual-audit flow. */
export async function getTransactionsSinceLastSnapshot(accountId: string) {
  const supabase = await createClient();
  const lastSnapshot = await getLastSnapshot(accountId);
  let query = supabase
    .from("transactions")
    .select("*")
    .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .order("date", { ascending: false });
  if (lastSnapshot) query = query.gte("date", lastSnapshot.date);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
