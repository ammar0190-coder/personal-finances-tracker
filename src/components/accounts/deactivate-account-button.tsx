"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateAccount } from "@/lib/actions/accounts";

/** PRD §3/§12: soft-delete only — never touches historical transactions. */
export function DeactivateAccountButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deactivateAccount(accountId);
              router.refresh();
            })
          }
          className="text-destructive underline"
        >
          {isPending ? "…" : "Confirm"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground underline">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-muted-foreground hover:text-destructive text-xs underline"
      title="Hides this account from pickers. Past transactions are untouched."
    >
      Deactivate
    </button>
  );
}
