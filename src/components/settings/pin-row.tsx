import { SettingsRow } from "@/components/settings/settings-row";

/**
 * D-18 / M8 design spec §5 — deliberately inert, and this is the whole
 * component.
 *
 * PRD §2 specifies a quick-unlock PIN, and `users.pin_hash` exists. M8 is a
 * design and settings pass and must not implement credential handling: a PIN
 * compared on the client exposes its own hash, and four digits falls to an
 * offline guess immediately. Real support needs server-side verification, a
 * hashing dependency and rate limiting — its own milestone, routed through
 * `security-review`.
 *
 * So there is no control here at all, rather than a disabled one that implies
 * the feature is a click away. `src/app/__tests__/pin-boundary.test.ts` fails
 * if anyone wires this up.
 */
export function PinRow() {
  return (
    <SettingsRow
      label="Quick-unlock PIN"
      description="Not built yet. It needs server-side verification to be worth having, so it is waiting on its own security pass rather than shipping as a PIN checked in your browser."
      control={<span className="text-xs text-muted-foreground">Not set up</span>}
    />
  );
}
