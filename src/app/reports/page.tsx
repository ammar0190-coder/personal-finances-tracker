import Link from "next/link";
import { getCategoryBreakdown, getMonthlyTrend, getSavingsRateForPeriod } from "@/lib/data/reports";
import { CategoryBreakdownChart } from "@/components/reports/category-breakdown-chart";
import { TrendChart } from "@/components/reports/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/ledger/format";

type Window = "weekly" | "monthly" | "all-time";

function periodBounds(window: Window): { start: string; end: string; label: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  if (window === "weekly") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 7);
    return { start: start.toISOString().slice(0, 10), end, label: "Last 7 days" };
  }
  if (window === "all-time") {
    return { start: "1970-01-01", end, label: "All time" };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  return { start, end, label: "This calendar month" };
}

/**
 * PRD §9 Reports — monthly is the primary lens, with weekly/monthly/all-time
 * toggle for category-spend analysis specifically. Plain links (not a
 * client-side select) so the period is a real URL param, shareable/bookmarkable.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const params = await searchParams;
  const window: Window = params.window === "weekly" || params.window === "all-time" ? params.window : "monthly";
  const { start, end, label } = periodBounds(window);

  const [breakdown, trend, savings] = await Promise.all([
    getCategoryBreakdown(start, end),
    getMonthlyTrend(12),
    getSavingsRateForPeriod(start, end),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">Reports</h1>
        <Link href="/" className="text-muted-foreground text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Category breakdown — {label}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-3 text-xs">
            {(["weekly", "monthly", "all-time"] as const).map((w) => (
              <Link
                key={w}
                href={`/reports?window=${w}`}
                className={w === window ? "font-medium underline" : "text-muted-foreground underline"}
              >
                {w}
              </Link>
            ))}
          </div>
          <CategoryBreakdownChart rows={breakdown} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend — last 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart points={trend} />
          <p className="text-muted-foreground mt-2 text-xs">
            Effective spend — a past month can keep shrinking as refunds/repayments land against
            it (PRD §10.3).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Savings rate — {label}</CardTitle>
        </CardHeader>
        <CardContent>
          {savings.rate === null ? (
            <p className="text-muted-foreground text-sm">No income logged for this period yet.</p>
          ) : (
            <p className="text-2xl font-semibold">{(Number(savings.rate) * 100).toFixed(1)}%</p>
          )}
          <p className="text-muted-foreground text-xs">{formatMoney(savings.raw)} moved into savings</p>
        </CardContent>
      </Card>
    </div>
  );
}
