import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAccountsWithBalances } from "@/lib/data/balances";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { LogoutButton } from "@/components/auth/logout-button";
import { AddAccountForm } from "@/components/onboarding/add-account-form";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { AccountRow } from "@/components/dashboard/account-row";
import { DeactivateCategoryButton } from "@/components/categories/deactivate-category-button";
import { RecurringSection } from "@/components/recurring/recurring-section";
import { BurnDown } from "@/components/dashboard/burn-down";
import { IouSnapshot } from "@/components/dashboard/iou-snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeedCategoriesButton } from "@/components/onboarding/seed-categories-button";
import { formatMoney } from "@/lib/ledger/format";

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
        <div className="flex items-center gap-4">
          <Link href="/investments" className="text-muted-foreground text-sm underline">
            Investments →
          </Link>
          <Link href="/iou" className="text-muted-foreground text-sm underline">
            IOU →
          </Link>
          <Link href="/reports" className="text-muted-foreground text-sm underline">
            Reports →
          </Link>
          <LogoutButton />
        </div>
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
                <AccountRow key={a.id} account={a} privacyMode={privacyMode} />
              ))}
              <details className="mt-2">
                <summary className="text-muted-foreground cursor-pointer text-xs">Add another account</summary>
                <div className="mt-3">
                  <AddAccountForm />
                </div>
              </details>
            </CardContent>
          </Card>

          <BurnDown />

          <IouSnapshot />

          <RecurringSection accounts={accounts} categories={categories} />

          <Card>
            <CardHeader>
              <CardTitle>Log a transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <AddTransactionForm accounts={accounts} categories={categories} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {categories
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span>{c.name}</span>
                      <DeactivateCategoryButton categoryId={c.id} />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <RecentTransactions accounts={accounts} categories={categories} />
        </>
      )}
    </div>
  );
}

async function RecentTransactions({
  accounts,
  categories,
}: {
  accounts: Awaited<ReturnType<typeof listAccountsWithBalances>>;
  categories: Awaited<ReturnType<typeof listCategories>>;
}) {
  const transactions = await listTransactions({ limit: 15 });
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {transactions.length === 0 && <p className="text-muted-foreground text-sm">Nothing logged yet.</p>}
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{accountsById[t.account_id] ?? "?"}</span>
              <span className="text-muted-foreground ml-2">
                {t.category_id ? categoriesById[t.category_id] : t.type}
              </span>
              {t.note && <span className="text-muted-foreground ml-2">— {t.note}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">{t.date}</span>
              <span className="font-mono tabular-nums">{formatMoney(t.amount)}</span>
              <TransactionActions transaction={t} accounts={accounts} categories={categories} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
