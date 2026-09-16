import { createClient } from "@/lib/supabase/server";
import { listAccountsWithBalances } from "@/lib/data/balances";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { AppShell } from "@/components/shell/app-shell";
import { AddAccountForm } from "@/components/onboarding/add-account-form";
import { QuickAdd } from "@/components/transactions/quick-add";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { AccountRow } from "@/components/dashboard/account-row";
import { DeactivateCategoryButton } from "@/components/categories/deactivate-category-button";
import { RecurringSection } from "@/components/recurring/recurring-section";
import { BurnDown } from "@/components/dashboard/burn-down";
import { IouSnapshot } from "@/components/dashboard/iou-snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeedCategoriesButton } from "@/components/onboarding/seed-categories-button";
import { formatMoney } from "@/lib/ledger/format";
import { SECTION_HEADING, SECTION_LABEL } from "@/components/shell/section";



/**
 * PRD §8, in the order the Dashboard ranks things, and in the shapes the
 * date-range audit settled (docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md):
 *
 *   Accounts        — a position. Never scoped to a period.
 *   This cycle      — the one computed block, and so the one card.
 *   Recurring       — relative to today, not to any selected window.
 *   IOUs            — a position, below balances and burn-down as §8 ranks it.
 *   Recent activity — a feed of the latest entries, not a window.
 *
 * Investments are deliberately absent; they live only in their own module
 * (§6, §8).
 */
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
  const hasAccounts = accounts.length > 0;

  return (
    <AppShell
      title="Dashboard"
      subtitle={profile?.name ?? user?.email}
      actions={hasAccounts ? <QuickAdd accounts={accounts} categories={categories} /> : undefined}
    >
      {!hasAccounts ? (
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
          {/* A ledger, not a card: the most important block on the page, earning
              its weight from type and rules rather than from a container. */}
          <section aria-label="Accounts" className="flex flex-col">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className={SECTION_LABEL}>Your accounts</h2>
              <span className="text-xs text-muted-foreground">Tap a balance to reveal it</span>
            </div>
            <div className="border-t border-border">
              {accounts.map((a) => (
                <div key={a.id} className="border-b border-border/60 py-3">
                  <AccountRow account={a} privacyMode={privacyMode} />
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">Add another account</summary>
              <div className="mt-3">
                <AddAccountForm />
              </div>
            </details>
          </section>

          <BurnDown />

          <RecurringSection accounts={accounts} categories={categories} />

          <IouSnapshot />

          <RecentTransactions accounts={accounts} categories={categories} />

          <section aria-label="Categories" className="flex flex-col">
            <h2 className={SECTION_HEADING}>Categories</h2>
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
          </section>
        </>
      )}
    </AppShell>
  );
}

/**
 * A feed of the latest entries, not a window — PRD §8 says "a short feed of the
 * latest log entries", and the audit deliberately kept the date-range control
 * from scoping it.
 */
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
    <section aria-label="Recent transactions" className="flex flex-col">
      <h2 className={SECTION_HEADING}>Recent activity</h2>
      {transactions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing logged yet — your first expense will show up here.
        </p>
      )}
      <div className="flex flex-col">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 border-b border-border/60 py-3 text-sm"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">{accountsById[t.account_id] ?? "?"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {t.category_id ? categoriesById[t.category_id] : t.type}
                {t.note && ` — ${t.note}`}
                {` · ${t.date}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums">{formatMoney(t.amount)}</span>
              <TransactionActions transaction={t} accounts={accounts} categories={categories} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
