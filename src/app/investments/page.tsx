import Link from "next/link";
import { listAccountsWithBalances } from "@/lib/data/balances";
import { listInstruments, listInvestmentHoldingsWithTotals } from "@/lib/data/instruments";
import { AddInstrumentForm } from "@/components/investments/add-instrument-form";
import { LogInvestmentForm } from "@/components/investments/log-investment-form";
import { HoldingsList } from "@/components/investments/holdings-list";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">Investments</h1>
        <Link href="/" className="text-muted-foreground text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Investment Holdings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <HoldingsList holdings={holdings} />
          <details>
            <summary className="text-muted-foreground cursor-pointer text-xs">Log a contribution</summary>
            <div className="mt-3">
              <LogInvestmentForm accounts={accounts} instruments={instruments} />
            </div>
          </details>
          <details>
            <summary className="text-muted-foreground cursor-pointer text-xs">Add a new instrument</summary>
            <div className="mt-3">
              <AddInstrumentForm />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Savings Accounts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {savingsAccounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No accounts flagged as savings yet — flag one from the Dashboard&apos;s account
              setup.
            </p>
          ) : (
            savingsAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <MaskedBalance value={a.balance} defaultMasked={privacyMode} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
