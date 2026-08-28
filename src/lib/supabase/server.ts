import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Verified against Supabase's current official Next.js example
 * (fetched 2026-08-28).
 *
 * The try/catch around `setAll` is deliberate, not defensive-programming
 * cruft: a Server Component is allowed to call this, but Next.js forbids
 * writing cookies from one — that write only succeeds from a Server Action
 * or Route Handler. Silently discarding is safe here specifically because
 * `src/proxy.ts` refreshes the session on every request regardless.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — see doc comment above.
          }
        },
      },
    },
  );
}
