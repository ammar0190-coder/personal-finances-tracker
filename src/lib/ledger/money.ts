/**
 * The one sanctioned crossing point between a `numeric` column read through
 * Supabase/PostgREST and the rest of the app. See docs/DECISIONS.md D-7.
 *
 * PostgREST serializes Postgres `numeric` as a bare JSON number, so
 * supabase-js hands back a JS `number` (float64), not a string — confirmed
 * empirically against a local instance, not assumed. That number is still
 * exact for any realistic 2-decimal-place currency amount: ECMAScript's
 * Number-to-string conversion always produces the shortest decimal that
 * round-trips back to the same float, which for a value that started as a
 * ≤14-digit decimal literal is the original literal itself. `toMoneyString`
 * exists to make that the ONLY place this reasoning has to be trusted —
 * every other line of code just sees a string and hands it to Decimal.
 *
 * The property this depends on breaks only if arithmetic is performed on the
 * raw number BEFORE this conversion (e.g. summing several `t.amount` values
 * with `+` before stringifying). Never do that — always convert at read time,
 * immediately, per value.
 */
export function toMoneyString(value: number | string): string {
  return typeof value === "string" ? value : value.toString();
}
