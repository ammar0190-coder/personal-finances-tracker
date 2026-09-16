import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { SECTION_LABEL } from "@/components/shell/section";
import { SettingsRow } from "@/components/settings/settings-row";
import { PrivacyModeToggle } from "@/components/settings/privacy-mode-toggle";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { TimezoneSelect } from "@/components/settings/timezone-select";
import { PinRow } from "@/components/settings/pin-row";

/**
 * PRD §8's "Settings (tucked into Account Settings, not on the dashboard
 * itself)". Two of these — privacy mode and the PIN — are MVP items from §2
 * that had schema support and no surface at all until M8c, which is why
 * `privacy_mode_enabled` could never be changed despite masking working.
 *
 * Sections and hairlines, no cards: D-17 keeps the card a Dashboard-only
 * device meaning "the one computed block among recorded facts", and nothing
 * here is computed.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name, privacy_mode_enabled, timezone")
    .eq("id", user!.id)
    .single();

  return (
    <AppShell title="Settings" subtitle={profile?.name ?? user?.email}>
      <section aria-label="Display" className="flex flex-col">
        <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Display</h2>

        <SettingsRow
          label="Privacy mode"
          description="Masks account balances as ₹xx,xx,xxx until you tap one. The burn-down and IOU totals are always shown plainly."
          control={<PrivacyModeToggle enabled={profile?.privacy_mode_enabled ?? true} />}
        />

        <SettingsRow
          label="Theme"
          description="Dark is the default. The choice is remembered in this browser, not on your account."
          control={<ThemeToggle />}
        />

        <SettingsRow
          label="Timezone"
          description="Times are stored in UTC and shown in this zone."
          control={<TimezoneSelect timezone={profile?.timezone ?? "UTC"} />}
        />
      </section>

      <section aria-label="Security" className="flex flex-col">
        <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Security</h2>
        <PinRow />
      </section>
    </AppShell>
  );
}
