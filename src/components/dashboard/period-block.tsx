import { getCurrentBudgetCycle, getPeriodTotals } from "@/lib/data/dashboard";
import { resolveDashboardRange } from "@/lib/dashboard/range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/ledger/format";

/**
 * The one computed block on the Dashboard, and so the one card (D-17).
 *
 * It has two shapes, and which one it takes is decided ONLY by
 * `resolveDashboardRange` (PRD §8, audit Q3, D-16):
 *
 *   cycle  — the selected window is the current budget cycle: a full burn-down
 *            against that cycle's ceiling (§10.4).
 *   custom — any other window: spend and income, and nothing else. No ceiling,
 *            no earmarking, no available-to-spend, no progress bar.
 *
 * The block changes shape rather than showing the same shape with degraded
 * numbers. Blank fields would read as "data missing", and hiding it entirely
 * would throw away exactly the period information the picker exists to expose.
 */
export async function PeriodBlock({ from, to }: { from?: string; to?: string }) {
  const cycle = await getCurrentBudgetCycle();
  const today = cycle?.today ?? new Date().toISOString().slice(0, 10);
  const range = resolveDashboardRange({ from, to }, today, cycle?.cycleStart ?? null);

  if (range.mode === "custom") {
    const totals = await getPeriodTotals(range.start, range.end);
    return <PeriodTotalsBlock {...totals} />;
  }

  return <CycleBurnDown cycle={cycle} />;
}

/** PRD §8's "raw totals": a window with no ceiling to measure against. */
function PeriodTotalsBlock({
  start,
  end,
  spend,
  income,
}: {
  start: string;
  end: string;
  spend: string;
  income: string;
}) {
  return (
    // A named landmark, so the block is addressable whichever shape it takes
    // and so its title reaches the document outline — CardTitle renders a div.
    <section aria-label="Selected period">
      <Card>
        <CardHeader>
          <CardTitle>Selected period</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground text-xs">
            {start} to {end}
          </p>
          <div className="flex justify-between">
            <span>Spend</span>
            <span className="tabular-nums">{formatMoney(spend)}</span>
          </div>
          <div className="flex justify-between">
            <span>Income</span>
            <span className="tabular-nums">{formatMoney(income)}</span>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            This window isn&apos;t a budget cycle, so there is no ceiling to measure it against —
            available-to-spend applies to a cycle only (PRD §10.4).
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

/** PRD §8/§10.4: spend burn-down for the current budget cycle. Unchanged by M8c. */
function CycleBurnDown({ cycle }: { cycle: Awaited<ReturnType<typeof getCurrentBudgetCycle>> }) {
  // availableToSpend is only null when there is no cycle yet.
  if (!cycle || !cycle.cycleStart || cycle.availableToSpend === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend burn-down</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No budget cycle yet — transfer money into your designated spend account to start one
            (PRD §3).
          </p>
        </CardContent>
      </Card>
    );
  }

  const negative = cycle.availableToSpend?.startsWith("-");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend burn-down</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p className="text-muted-foreground text-xs">Cycle since {cycle.cycleStart}</p>
        <div className="flex justify-between">
          <span>Budget ceiling this cycle</span>
          <span className="tabular-nums">{formatMoney(cycle.transferredIntoSpendAccount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Spent so far</span>
          <span className="tabular-nums">{formatMoney(cycle.periodSpend)}</span>
        </div>
        {cycle.upcomingRecurringDue !== "0" && (
          <div className="flex justify-between">
            <span>Earmarked (due, unconfirmed)</span>
            <span className="tabular-nums">{formatMoney(cycle.upcomingRecurringDue)}</span>
          </div>
        )}
        <div className={`mt-1 flex justify-between border-t pt-1 font-medium ${negative ? "text-destructive" : ""}`}>
          <span>Available to spend</span>
          <span className="tabular-nums">{formatMoney(cycle.availableToSpend)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
