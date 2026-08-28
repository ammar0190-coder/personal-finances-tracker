export type RecurringFrequency = "monthly" | "quarterly" | "annual" | "custom";

interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

function parseDate(date: string): CalendarDate {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Number of days in a given (1-indexed) month of a given year. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(date: CalendarDate, months: number): CalendarDate {
  const totalMonths = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  // Clamp to the target month's last valid day — PRD §10.11's explicit rule
  // for the 31st landing in a shorter month (and, as a consequence, Feb 29
  // landing in a non-leap year for the `annual` case).
  const day = Math.min(date.day, daysInMonth(year, month));
  return { year, month, day };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const ms = Date.UTC(date.year, date.month - 1, date.day) + days * 86_400_000;
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * A Recurring Template's `next_due_date`, advanced by exactly one unit of
 * `frequency` after a confirmed posting. PRD §10.11.
 *
 * `customIntervalDays` is not in the PRD's original RECURRING_TEMPLATES
 * table (§11 only names the `frequency` enum, with no accompanying
 * interval field) — `custom` has no defined semantics without one. Added
 * as a schema field alongside this function; see docs/DECISIONS.md D-4.
 */
export function computeNextDueDate(
  currentDueDate: string,
  frequency: RecurringFrequency,
  customIntervalDays?: number,
): string {
  const current = parseDate(currentDueDate);
  switch (frequency) {
    case "monthly":
      return formatDate(addMonths(current, 1));
    case "quarterly":
      return formatDate(addMonths(current, 3));
    case "annual":
      return formatDate(addMonths(current, 12));
    case "custom":
      if (!customIntervalDays || customIntervalDays <= 0) {
        throw new Error(
          "computeNextDueDate: a `custom` frequency needs a positive customIntervalDays — there is nothing to advance by otherwise.",
        );
      }
      return formatDate(addDays(current, customIntervalDays));
    default: {
      const exhaustive: never = frequency;
      throw new Error(`computeNextDueDate: unhandled frequency ${exhaustive as string}`);
    }
  }
}
