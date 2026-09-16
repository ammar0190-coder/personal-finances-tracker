"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleLogin() {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // On success the browser is redirected to Google; this component
      // unmounts before isLoading matters again.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong signing in.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl leading-none">Finances</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Where your money actually is, across accounts, investments and what you owe.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-8">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleGoogleLogin} className="w-full" disabled={isLoading}>
          {isLoading ? "Redirecting to Google…" : "Continue with Google"}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          One Google account is one fully separate, private setup. This isn&apos;t a public
          product — access is limited to accounts the owner has chosen to add.
        </p>
      </div>
    </div>
  );
}
