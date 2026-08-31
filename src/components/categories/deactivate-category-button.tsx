"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateCategory } from "@/lib/actions/categories";

/** PRD §4/§12: same soft-delete rule as accounts. */
export function DeactivateCategoryButton({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deactivateCategory(categoryId);
          router.refresh();
        })
      }
      className="text-muted-foreground hover:text-destructive text-xs underline"
      title="Hides this category from pickers. Past transactions are untouched."
    >
      {isPending ? "…" : "Deactivate"}
    </button>
  );
}
