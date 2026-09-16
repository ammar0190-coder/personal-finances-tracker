import { getCurrentBudgetCycle } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/ledger/format";

/** PRD §8/§10.4: spend burn-down for the current budget cycle. */
export async function BurnDown() {
  const cycle = await getCurrentBudgetCycle();

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
