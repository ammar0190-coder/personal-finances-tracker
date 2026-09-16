/**
 * The Dashboard's date-range control (PRD §8), scoped by the approved audit
 * (docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md, D-16).
 *
 * Read the audit before changing anything here. Its finding, in one line:
 * **most of the Dashboard is not period data.** Account balances and the IOU
 * snapshot are positions as of now; recurring "due now" is relative to today;
 * recent activity is a feed of the latest N. The range scopes exactly one
 * figure — spend-so-far — and only when the selected window is not the current
 * cycle.
 *
 * So this module returns a window and which of two shapes the period block
 * should take. It returns nothing else, and nothing else on the page receives
 * it. `src/app/__tests__/dashboard-scope.test.ts` fails if that changes.
 */

export type DashboardRange =
  /** The current budget cycle: a full burn-down against its ceiling. */
  | { mode: "cycle"; start: string | null; end: string }
  /**
   * Any other window: spend and income only. §8's "raw totals" — no ceiling,
   * no earmarking, no available-to-spend and no progress bar, because a
   * progress bar with no denominator is a lie.
   */
  | { mode: "custom"; start: string; end: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD — rejects 2026-02-31 as well as junk. */
function isCalendarDate(value: string | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/**
 * `cycleStart` comes from the spend-account transfer log (`findCurrentCycleStart`,
 * D-8), never from `params` — that is the boundary that keeps the picker from
 * redefining what a budget cycle is.
 *
 * Anything that cannot be honoured falls back to the cycle rather than being
 * repaired. A swapped or half-guessed window would put a real-looking number
 * against a period nobody selected, which is the failure mode this whole
 * feature was gated on avoiding.
 */
export function resolveDashboardRange(
  params: { from?: string; to?: string },
  today: string,
  cycleStart: string | null,
): DashboardRange {
  const cycle = { mode: "cycle", start: cycleStart, end: today } as const;

  const { from, to } = params;
  if (!isCalendarDate(from) || !isCalendarDate(to)) return cycle;
  if (from > to) return cycle;

  // The selected window IS the current cycle: §8 says render the burn-down.
  if (cycleStart !== null && from === cycleStart && to === today) return cycle;

  return { mode: "custom", start: from, end: to };
}
