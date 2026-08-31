"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRecurringPosting } from "@/lib/actions/recurring";
import { toMoneyString } from "@/lib/ledger/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecurringTemplate } from "@/lib/data/recurring";
import type { Account } from "@/lib/data/accounts";

/**
 * PRD §5 "Confirm-before-posting": surfaces on the due date rather than
 * silently logging, amount editable at that moment (e.g. a gym fee increase).
 */
export function DueRecurringCard({
  template,
  subjectName,
  account,
}: {
  template: RecurringTemplate;
  subjectName: string;
  account?: Account;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(toMoneyString(template.amount));
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await confirmRecurringPosting(template.id, amount);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't confirm that.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">
          {subjectName} — {account?.name ?? "?"}
        </p>
        <p className="text-muted-foreground text-xs">
          Due {template.next_due_date}
          {error && <span className="text-destructive ml-2">{error}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28"
        />
        <Button size="sm" onClick={handleConfirm} disabled={isPending}>
          {isPending ? "…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
