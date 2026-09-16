import Link from "next/link";
import { SECTION_LABEL } from "@/components/shell/section";

/**
 * PRD §8's custom date-range picker.
 *
 * A plain GET form, like Reports' period toggle: the window becomes real URL
 * params, so it survives a reload and can be bookmarked, and the page stays
 * server-rendered with no client state.
 *
 * Read `docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md` before
 * changing anything here. What this control scopes is ONE figure — the period
 * block below it. The wording is deliberately "Selected period", not a
 * dashboard-wide filter, because balances and IOU totals are positions as of
 * now and do not move with it.
 */
export function DateRangeControl({
  from,
  to,
  isCustom,
}: {
  from?: string;
  to?: string;
  /** Whether a window other than the current cycle is in effect. */
  isCustom: boolean;
}) {
  return (
    <form method="get" action="/" aria-label="Date range" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={SECTION_LABEL}>Date range</h2>
        {isCustom && (
          // Not a reset button: clearing the params IS the default state, so a
          // plain link back to the page is the honest way to express it.
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back to current cycle
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Apply
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Scopes the figures below only. Account balances and IOU totals are where you stand now, so
        they never move with this.
      </p>
    </form>
  );
}
