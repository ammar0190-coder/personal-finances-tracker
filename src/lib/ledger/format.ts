import { Decimal } from "decimal.js";
import { toMoneyString } from "@/lib/ledger/money";

/**
 * The one way a monetary amount is shown to a person: ₹, two decimal places,
 * Indian digit grouping (₹12,34,567.89 — the same shape as the masked
 * "₹xx,xx,xxx" placeholder), minus sign before the symbol.
 *
 * Display only. It never feeds back into arithmetic, and it goes through
 * Decimal (half-up to paise) rather than Number#toFixed, whose binary rounding
 * turns 2.675 into 2.67. A plain number is taken to be a PostgREST numeric and
 * crosses into Decimal via toMoneyString, per docs/DECISIONS.md D-7.
 */
export function formatMoney(value: Decimal | string | number): string {
  const amount = value instanceof Decimal ? value : new Decimal(toMoneyString(value));
  const rounded = amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const [whole, paise] = rounded.abs().toFixed(2).split(".");
  const sign = rounded.isNegative() && !rounded.isZero() ? "-" : "";
  return `${sign}₹${groupIndian(whole)}.${paise}`;
}

/** 1234567 → 12,34,567: the last three digits, then groups of two. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+$)/g, ",")},${tail}`;
}
