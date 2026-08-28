import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and redirects an
 * unauthenticated request away from anything that isn't the login/auth flow
 * or the marketing-free root. PRD §2/§13: Google OAuth is the sole identity
 * provider, and every route past onboarding needs a real session — there's
 * no guest mode.
 *
 * Verified against Supabase's current official Next.js example
 * (fetched 2026-08-28) — Next.js 16 renamed `middleware.ts`/`middleware()` to
 * `src/proxy.ts`/`proxy()` (this file's caller), which is exactly the kind of
 * breaking-change-vs-training-data AGENTS.md warns about.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims() — see the
  // upstream example's own warning: skipping this can log users out at
  // random because the token never gets refreshed.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
