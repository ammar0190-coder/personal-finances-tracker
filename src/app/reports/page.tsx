import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { SECTION_LABEL } from "@/components/shell/section";
import { getCategoryBreakdown, getMonthlyTrend, getSavingsRateForPeriod } from "@/lib/data/reports";
import { CategoryBreakdownChart } from "@/components/reports/category-breakdown-chart";
import { TrendChart } from "@/components/reports/trend-chart";
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
    <AppShell title="Reports">

      <section aria-label="Category breakdown" className="flex flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
          <h2 className={SECTION_LABEL}>Spend by category — {label}</h2>
          {/* Real URL params, not client state: a period stays shareable. */}
          <div className="flex gap-1 text-xs">
            {(["weekly", "monthly", "all-time"] as const).map((w) => (
              <Link
                key={w}
                href={`/reports?window=${w}`}
                aria-current={w === window ? "page" : undefined}
                className={
                  w === window
                    ? "rounded-md bg-secondary px-2.5 py-1 font-medium text-foreground"
                    : "rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground"
                }
              >
                {w === "all-time" ? "All time" : w[0].toUpperCase() + w.slice(1)}
              </Link>
            ))}
          </div>
        </div>
        <div className="pt-4">
          <CategoryBreakdownChart rows={breakdown} />
        </div>
      </section>

      <section aria-label="Trend" className="flex flex-col">
        <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Trend — last 12 months</h2>
        <div className="pt-4">
          <TrendChart points={trend} />
          <p className="mt-2 text-xs text-muted-foreground">
            Effective spend — a past month can keep shrinking as refunds and repayments land
            against it (PRD §10.3).
          </p>
        </div>
      </section>

      <section aria-label="Savings rate" className="flex flex-col">
        <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Savings rate — {label}</h2>
        <div className="flex items-baseline justify-between pt-4">
          {savings.rate === null ? (
            <p className="text-sm text-muted-foreground">No income logged for this period yet.</p>
          ) : (
            <p className="font-heading text-3xl tabular-nums">{(Number(savings.rate) * 100).toFixed(1)}%</p>
          )}
          <p className="text-xs text-muted-foreground">
            <span className="tabular-nums">{formatMoney(savings.raw)}</span> moved into savings
          </p>
        </div>
      </section>
    </AppShell>
  );
}
