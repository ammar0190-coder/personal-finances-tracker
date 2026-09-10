import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed `middleware` to `proxy` — see the doc comment in
// src/lib/supabase/proxy.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization; everything else gets a
    // session-refresh + auth check pass.
    //
    // sw.js, manifest.webmanifest and offline.html are skipped too: a browser
    // fetches all three before anyone has signed in, and redirecting them to
    // /auth/login makes the app silently non-installable (PRD §14).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
