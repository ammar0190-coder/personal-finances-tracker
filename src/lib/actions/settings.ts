"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * PRD §2/§8: privacy mode is a per-user setting, default on. Until M8c there
 * was no way to change it — the column existed and masking worked, but nothing
 * could reach the switch.
 */
export async function setPrivacyMode(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("users")
    .update({ privacy_mode_enabled: enabled })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

/**
 * PRD §10.11: timestamps are stored UTC and displayed in the user's own
 * timezone — a per-user setting, since the schema is multi-user from day one.
 */
export async function setTimezone(timezone: string) {
  if (!isSupportedTimezone(timezone)) throw new Error(`Unknown timezone: ${timezone}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("users").update({ timezone }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

function isSupportedTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
