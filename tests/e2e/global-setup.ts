import { E2E_SUPABASE_PUBLISHABLE_KEY, E2E_SUPABASE_URL, assertLocalSupabase } from "./support/local-supabase";

/** Stop early, with a clear message, if local Supabase isn't the target or isn't running. */
export default async function globalSetup() {
  assertLocalSupabase();
  try {
    const res = await fetch(`${E2E_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: E2E_SUPABASE_PUBLISHABLE_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    throw new Error(
      `Local Supabase isn't reachable at ${E2E_SUPABASE_URL} (${String(error)}). Run \`npx supabase start\` first.`,
    );
  }
}
