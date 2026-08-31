"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/actions/transactions";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";
import type { Transaction } from "@/lib/data/transactions";

/**
 * PRD §12 "Delete transaction": blocked with a plain-language explanation if
 * anything depends on it (deleteTransaction throws that explanation) — shown
 * here rather than a raw server error.
 */
export function TransactionActions({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTransaction(transaction.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete that.");
        setConfirming(false);
      }
    });
  }

  if (error) {
    return <span className="text-destructive text-xs">{error}</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-destructive underline"
        >
          {isPending ? "Deleting…" : "Confirm delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground underline">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <EditTransactionDialog transaction={transaction} accounts={accounts} categories={categories} />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-destructive text-xs underline"
      >
        Delete
      </button>
    </span>
  );
}
