import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl leading-none">Sign-in didn&apos;t work</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {params?.error
              ? "Google sent back an error rather than signing you in."
              : "Google sent back an error rather than signing you in, without saying why."}
          </p>
        </div>

        {params?.error && (
          <p className="border-l-2 border-destructive/60 pl-4 text-sm text-muted-foreground">
            {params.error}
          </p>
        )}

        <div className="border-t border-border pt-8">
          <Button render={<Link href="/auth/login">Try signing in again</Link>} className="w-full" />
        </div>
      </div>
    </div>
  );
}
