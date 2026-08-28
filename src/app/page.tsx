import { createClient } from "@/lib/supabase/server";
import { listAccountsWithBalances } from "@/lib/data/balances";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { LogoutButton } from "@/components/auth/logout-button";
import { AddAccountForm } from "@/components/onboarding/add-account-form";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { MaskedBalance } from "@/components/dashboard/masked-balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeedCategoriesButton } from "@/components/onboarding/seed-categories-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("privacy_mode_enabled, name")
    .eq("id", user!.id)
    .single();

  const [accounts, categories] = await Promise.all([listAccountsWithBalances(), listCategories()]);

  const privacyMode = profile?.privacy_mode_enabled ?? true;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Personal Finance Tracker</h1>
          <p className="text-muted-foreground text-sm">{profile?.name ?? user?.email}</p>
        </div>
        <LogoutButton />
      </header>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Let&apos;s set up your accounts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-sm">
                First, load the editable starter category template (Travel, Food, Shopping, House,
                Leisure, Miscellaneous + Salary, Misc income — PRD §3.1).
              </p>
              <SeedCategoriesButton categoryCount={categories.length} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Add your first account</p>
              <AddAccountForm />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {a.role || a.institution || a.account_type}
                      {a.account_type === "credit_card" && (
                        <Badge variant="secondary" className="ml-2">
                          owed
                        </Badge>
                      )}
                    </p>
                  </div>
                  <MaskedBalance value={a.balance} defaultMasked={privacyMode} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log a transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <AddTransactionForm accounts={accounts} categories={categories} />
            </CardContent>
          </Card>

          <RecentTransactions accountsById={Object.fromEntries(accounts.map((a) => [a.id, a.name]))} />
        </>
      )}
    </div>
  );
}

async function RecentTransactions({ accountsById }: { accountsById: Record<string, string> }) {
  const transactions = await listTransactions({ limit: 10 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {transactions.length === 0 && <p className="text-muted-foreground text-sm">Nothing logged yet.</p>}
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{accountsById[t.account_id] ?? "?"}</span>
              <span className="text-muted-foreground ml-2">{t.type}</span>
              {t.note && <span className="text-muted-foreground ml-2">— {t.note}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">{t.date}</span>
              <span className="font-mono tabular-nums">₹{t.amount}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
