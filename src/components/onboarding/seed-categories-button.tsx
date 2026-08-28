"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedDefaultCategories } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";

export function SeedCategoriesButton({ categoryCount }: { categoryCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (categoryCount > 0) {
    return <p className="text-muted-foreground text-sm">✓ {categoryCount} categories ready — editable anytime.</p>;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await seedDefaultCategories();
          router.refresh();
        })
      }
    >
      {isPending ? "Loading…" : "Load starter categories"}
    </Button>
  );
}
