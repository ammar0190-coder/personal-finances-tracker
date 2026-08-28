import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Supabase client for use in Client Components. Verified against Supabase's
 * current official Next.js example (examples/auth/nextjs in supabase/supabase,
 * fetched 2026-08-28) — this is the exact current pattern, not carried over
 * from stale training knowledge.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
