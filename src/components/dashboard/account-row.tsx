import { getTransactionsSinceLastSnapshot } from "@/lib/data/reconciliation";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { DeactivateAccountButton } from "@/components/accounts/deactivate-account-button";
import { ReconcileDialog } from "@/components/dashboard/reconcile-dialog";
import { Badge } from "@/components/ui/badge";
import type { AccountWithBalance } from "@/lib/data/balances";

export async function AccountRow({ account, privacyMode }: { account: AccountWithBalance; privacyMode: boolean }) {
  const transactionsSinceLastSnapshot = await getTransactionsSinceLastSnapshot(account.id);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{account.name}</p>
        <p className="text-muted-foreground text-xs">
          {account.role || account.institution || account.account_type}
          {account.account_type === "credit_card" && (
            <Badge variant="secondary" className="ml-2">
              owed
            </Badge>
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
