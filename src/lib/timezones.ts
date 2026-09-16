/**
 * The IANA zones offered in Account Settings (PRD §10.11).
 *
 * `Intl.supportedValuesOf` is the runtime's own list, so it cannot drift from
 * what `Intl.DateTimeFormat` accepts — which is what `setTimezone` validates
 * against. The fallback covers a runtime without it; UTC alone is a poor
 * picker, but an honest one, and never an invalid write.
 */
export const SUPPORTED_TIMEZONES: readonly string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

/**
 * The spelling THIS runtime uses for a zone.
 *
 * `supportedValuesOf` returns legacy aliases on current Node — `Asia/Calcutta`
 * rather than `Asia/Kolkata`, `Europe/Kiev` rather than `Europe/Kyiv` — while
 * the schema's default and every browser say `Asia/Kolkata`. A native <select>
 * whose value matches no option silently shows its first one instead, so
 * without this every user would have found "Africa/Abidjan" presented as their
 * timezone.
 *
 * An unresolvable value comes back unchanged: showing someone the odd string
 * they have stored beats crashing the Settings page over it.
 */
export function canonicalTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: timezone }).resolvedOptions().timeZone;
  } catch {
    return timezone;
  }
}

/** The list to render, guaranteed to contain whatever is currently stored. */
export function timezoneOptions(current: string): string[] {
  const canonical = canonicalTimezone(current);
  return SUPPORTED_TIMEZONES.includes(canonical)
    ? [...SUPPORTED_TIMEZONES]
    : [canonical, ...SUPPORTED_TIMEZONES];
}
