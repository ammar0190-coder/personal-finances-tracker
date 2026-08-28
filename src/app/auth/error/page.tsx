import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign-in didn&apos;t work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {params?.error ? `Error: ${params.error}` : "An unspecified error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
