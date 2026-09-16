/**
 * The E2E suite's only source of Supabase settings, and the guard that keeps
 * it off the hosted project.
 *
 * Never read NEXT_PUBLIC_SUPABASE_* here: a developer's .env.local may point at
 * production. The suite uses its own E2E_* variables, which default to the
 * fixed keys `supabase start` issues for local development (the same defaults
 * the integration tests use), and assertLocalSupabase() rejects any URL that
 * isn't on this machine.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../../../src/types/database";

export const E2E_SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const E2E_SUPABASE_PUBLISHABLE_KEY =
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
export const E2E_SUPABASE_SECRET_KEY =
  process.env.E2E_SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function assertLocalSupabase(url: string = E2E_SUPABASE_URL): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to run E2E tests against ${hostname}: E2E_SUPABASE_URL must point at local Supabase ` +
        `(npx supabase start), never a hosted project.`,
    );
  }
}

/** Any hosted Supabase host; browser requests matching this are blocked. */
export const HOSTED_SUPABASE = /\.supabase\.(co|com|net|in)\b/;

/**
 * A real hosted project URL (20-character project ref). Narrower than
 * HOSTED_SUPABASE because supabase-js ships doc comments with sample hosts
 * like xyzcompany.supabase.co, which aren't configuration.
 */
export const HOSTED_PROJECT_URL = /https:\/\/[a-z0-9]{20}\.supabase\.co\b/;

export function adminClient(): SupabaseClient<Database> {
  assertLocalSupabase();
  return createClient<Database>(E2E_SUPABASE_URL, E2E_SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * A fresh confirmed user. Real sign-in is Google-only, so tests use a
 * password user on local Supabase instead; the profile row comes from the
 * same on_auth_user_created trigger a Google sign-in fires.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = { email: `e2e-${label}-${stamp}@example.com`, password: `e2e-password-${stamp}` };
  const { data, error } = await adminClient().auth.admin.createUser({
    ...user,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${label}`, sub: `e2e-sub-${stamp}` },
  });
  if (error) throw error;
  return { id: data.user.id, ...user };
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) throw error;
}

/**
 * Session cookies exactly as the app's own server client would write them
 * (@supabase/ssr decides the names, chunking and encoding), ready to hand to
 * a browser context for `appUrl`.
 */
export async function sessionCookies(user: TestUser, appUrl: string) {
  assertLocalSupabase();
  const jar = new Map<string, string>();
  const client = createServerClient<Database>(E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  return [...jar].map(([name, value]) => ({ name, value, url: appUrl }));
}
