"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Personal Finance Tracker</CardTitle>
        <CardDescription>Sign in with the Google account you want to track.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleGoogleLogin} className="w-full" disabled={isLoading}>
            {isLoading ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          <p className="text-muted-foreground text-xs">
            One Google account = one fully separate, private setup. This isn&apos;t a public
            product — access is limited to accounts the owner has chosen to add.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
