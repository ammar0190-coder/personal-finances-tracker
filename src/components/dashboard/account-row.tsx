import { getTransactionsSinceLastSnapshot } from "@/lib/data/reconciliation";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { DeactivateAccountButton } from "@/components/accounts/deactivate-account-button";
import { ReconcileDialog } from "@/components/dashboard/reconcile-dialog";
import { ACCOUNT_TYPE_OPTIONS, labelFor } from "@/lib/select-options";
import type { AccountWithBalance } from "@/lib/data/balances";

/**
 * One row of the account ledger (M8 design spec §3.1.1 — "the most important
 * thing on the screen", carried by type and hairlines rather than a card).
 *
 * Laid out as a grid rather than a flex row, because the row needs a different
 * SHAPE on a phone, not just tighter spacing:
 *
 *   phone            desktop
 *   name   balance   name      balance  actions
 *   type   actions   type
 *
 * On a phone the name keeps the balance beside it — that pairing is the whole
 * point of the row — and the two secondary actions drop to the second line
 * alongside the account type. On desktop (md+) the layout is exactly what it
 * has always been: name over type on the left, then balance, then actions.
 *
 * It was a flex row with no `gap` and no `min-w-0`, which left the name's box
 * ending at 138px and the balance's starting at 138px — a zero-pixel gap, so
 * "HDFC Spending" ran straight into "₹xx,xx,xxx" at phone width.
 * `minmax(0,1fr)` is what lets the name column shrink and truncate at all; a
 * bare `1fr` refuses to go below its content and pushes the balance out again.
 * Guarded by tests/e2e/layout.spec.ts.
 */
export async function AccountRow({ account, privacyMode }: { account: AccountWithBalance; privacyMode: boolean }) {
  const transactionsSinceLastSnapshot = await getTransactionsSinceLastSnapshot(account.id);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_auto_auto]">
      <p className="col-start-1 row-start-1 truncate font-medium">{account.name}</p>

      <p className="col-start-1 row-start-2 truncate text-muted-foreground text-xs">
        {account.role || account.institution || labelFor(ACCOUNT_TYPE_OPTIONS, account.account_type)}
        {/* Credit-card debt is distinguished by the word and its position,
            not by a signal colour: §10.1 asks for "clearly distinguished",
            not "coloured", and a third hue would compete with the accent and
            the over-budget red. */}
        {account.account_type === "credit_card" && (
          <span className="ml-2 text-[0.625rem] tracking-[0.05em] text-owed uppercase">owed</span>
        )}
      </p>

      <div className="col-start-2 row-start-1 justify-self-end md:row-span-2 md:self-center">
        <MaskedBalance value={account.balance} defaultMasked={privacyMode} />
      </div>

      <div className="col-start-2 row-start-2 flex items-center gap-3 justify-self-end md:col-start-3 md:row-start-1 md:row-span-2 md:self-center">
        <ReconcileDialog accountId={account.id} accountName={account.name} transactionsSinceLastSnapshot={transactionsSinceLastSnapshot} />
        <DeactivateAccountButton accountId={account.id} />
      </div>
    </div>
  );
}
