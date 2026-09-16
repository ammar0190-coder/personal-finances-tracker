import { listRecurringTemplates, listDueRecurringTemplates } from "@/lib/data/recurring";
import { listInstruments } from "@/lib/data/instruments";
import { AddRecurringForm } from "@/components/recurring/add-recurring-form";
import { DueRecurringCard } from "@/components/recurring/due-recurring-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";
import type { RecurringTemplate } from "@/lib/data/recurring";
import { formatMoney } from "@/lib/ledger/format";

export async function RecurringSection({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [templates, due, instruments] = await Promise.all([
    listRecurringTemplates(),
    listDueRecurringTemplates(),
    listInstruments(),
  ]);
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const instrumentsById = Object.fromEntries(instruments.map((i) => [i.id, i]));
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const notYetDue = templates.filter((t) => !due.some((d) => d.id === t.id));

  function subjectName(t: RecurringTemplate): string {
    if (t.category_id) return categoriesById[t.category_id]?.name ?? "?";
    if (t.instrument_id) return instrumentsById[t.instrument_id]?.name ?? "?";
    return "?";
  }

  return (
    <>
      {due.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Due now ({due.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {due.map((t) => (
              <DueRecurringCard key={t.id} template={t} subjectName={subjectName(t)} account={accountsById[t.account_id]} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recurring items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {notYetDue.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {notYetDue.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span>
                    {subjectName(t)} — {accountsById[t.account_id]?.name ?? "?"} ({t.frequency})
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(t.amount)} · next {t.next_due_date}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary className="text-muted-foreground cursor-pointer text-xs">Add a recurring item</summary>
            <div className="mt-3">
              <AddRecurringForm accounts={accounts} categories={categories} instruments={instruments} />
            </div>
          </details>
        </CardContent>
      </Card>
    </>
  );
}
