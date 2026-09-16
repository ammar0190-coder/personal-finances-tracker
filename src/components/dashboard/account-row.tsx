import { getTransactionsSinceLastSnapshot } from "@/lib/data/reconciliation";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { DeactivateAccountButton } from "@/components/accounts/deactivate-account-button";
import { ReconcileDialog } from "@/components/dashboard/reconcile-dialog";
import { ACCOUNT_TYPE_OPTIONS, labelFor } from "@/lib/select-options";
import type { AccountWithBalance } from "@/lib/data/balances";

export async function AccountRow({ account, privacyMode }: { account: AccountWithBalance; privacyMode: boolean }) {
  const transactionsSinceLastSnapshot = await getTransactionsSinceLastSnapshot(account.id);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{account.name}</p>
        <p className="text-muted-foreground text-xs">
          {account.role || account.institution || labelFor(ACCOUNT_TYPE_OPTIONS, account.account_type)}
          {/* Credit-card debt is distinguished by the word and its position,
              not by a signal colour: §10.1 asks for "clearly distinguished",
              not "coloured", and a third hue would compete with the accent and
              the over-budget red. */}
          {account.account_type === "credit_card" && (
            <span className="ml-2 text-[0.625rem] tracking-[0.05em] text-owed uppercase">owed</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <MaskedBalance value={account.balance} defaultMasked={privacyMode} />
        <ReconcileDialog accountId={account.id} accountName={account.name} transactionsSinceLastSnapshot={transactionsSinceLastSnapshot} />
        <DeactivateAccountButton accountId={account.id} />
      </div>
    </div>
  );
}
