import { computeAccountBalance } from "@/lib/ledger/balance";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger/types";
import { listAccounts, type Account } from "@/lib/data/accounts";
import { listTransactions } from "@/lib/data/transactions";

export interface AccountWithBalance extends Account {
  balance: string;
}

/**
 * Every account for the current user, each with its tracked balance
 * computed live from the transaction log (PRD §10.1) — never a stored
 * column. This is the one place the DB rows get mapped into the pure
 * `lib/ledger` shapes; the ledger module itself stays Supabase-agnostic.
 */
export async function listAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const [accounts, transactions] = await Promise.all([listAccounts(), listTransactions()]);

  const ledgerTransactions: LedgerTransaction[] = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    amount: toMoneyString(t.amount),
    date: t.date,
    linkedTransactionId: null, // not needed for balance calc
    relatedIouEntryId: t.related_iou_entry_id,
  }));

  return accounts.map((account) => {
    const ledgerAccount: LedgerAccount = {
      id: account.id,
      accountType: account.account_type,
      isSpendAccount: account.is_spend_account,
      isSavings: account.is_savings,
    };
    const balance = computeAccountBalance(ledgerAccount, ledgerTransactions);
    return { ...account, balance: balance.toString() };
  });
}
