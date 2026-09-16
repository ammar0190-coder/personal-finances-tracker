import { AppShell } from "@/components/shell/app-shell";
import { SECTION_LABEL } from "@/components/shell/section";
import { listAccountsWithBalances } from "@/lib/data/balances";
import { listInstruments, listInvestmentHoldingsWithTotals } from "@/lib/data/instruments";
import { AddInstrumentForm } from "@/components/investments/add-instrument-form";
import { LogInvestmentForm } from "@/components/investments/log-investment-form";
import { HoldingsList } from "@/components/investments/holdings-list";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { createClient } from "@/lib/supabase/server";

/**
 * PRD §6: Investment Holdings and Savings Accounts, two visually separate
 * sections that are never merged — and deliberately its own page, since §6
 * keeps investment totals off the main Dashboard on purpose.
 */
export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("privacy_mode_enabled")
    .eq("id", user!.id)
    .single();
  const privacyMode = profile?.privacy_mode_enabled ?? true;

  const [accounts, instruments, holdings] = await Promise.all([
    listAccountsWithBalances(),
    listInstruments(),
    listInvestmentHoldingsWithTotals(),
  ]);
  const savingsAccounts = accounts.filter((a) => a.is_savings);

  return (
    <AppShell title="Investments">

      {/* PRD §6: Investment Holdings and Savings Accounts are two genuinely
          different things — capital deployed into instruments, and cash set
          aside — and must never merge into one view. Equal weight, kept apart
          by their own section rules rather than by being boxed. */}
      <section aria-label="Investment Holdings" className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <h2 className={SECTION_LABEL}>Investment holdings</h2>
          <span className="text-xs text-muted-foreground">capital deployed into instruments</span>
        </div>
        <div className="flex flex-col gap-4 pt-4">
          <HoldingsList holdings={holdings} />
          <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Log a contribution</summary>
              <div className="mt-3">
                <LogInvestmentForm accounts={accounts} instruments={instruments} />
              </div>
            </details>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Add a new instrument</summary>
              <div className="mt-3">
                <AddInstrumentForm />
              </div>
            </details>
          </div>
        </div>
      </section>

      <section aria-label="Savings Accounts" className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <h2 className={SECTION_LABEL}>Savings accounts</h2>
          <span className="text-xs text-muted-foreground">cash set aside, not invested</span>
        </div>
        {savingsAccounts.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">
            Nothing flagged as savings yet. Mark an account as savings when you add or edit it on
            the Dashboard, and its balance will be tracked here — separately from anything
            invested.
          </p>
        ) : (
          <div className="flex flex-col">
            {savingsAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-border/60 py-3 text-sm">
                <span className="font-medium">{a.name}</span>
                <MaskedBalance value={a.balance} defaultMasked={privacyMode} />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
