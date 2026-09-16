"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reconcileAccount, type ReconcileResult } from "@/lib/actions/reconciliation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Transaction } from "@/lib/data/transactions";
import { formatMoney } from "@/lib/ledger/format";

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * PRD §3/§10.10 "Reconcile now" — the only trigger for reconciliation, no
 * automatic nudges. A delta under the audit threshold corrects itself; a
 * bigger one shows what's changed since the last reconciliation and asks
 * the user to review rather than guessing at a correcting entry for them.
 */
export function ReconcileDialog({
  accountId,
  accountName,
  transactionsSinceLastSnapshot,
}: {
  accountId: string;
  accountName: string;
  transactionsSinceLastSnapshot: Transaction[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actualBalance, setActualBalance] = useState("");
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await reconcileAccount(accountId, actualBalance, TODAY);
        setResult(r);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reconcile that.");
      }
    });
  }

  function handleClose(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setResult(null);
      setActualBalance("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger className="text-muted-foreground hover:text-foreground text-xs underline">
        Reconcile
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconcile {accountName}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="actual-balance">What the bank app shows right now</Label>
              <Input
                id="actual-balance"
                type="number"
                step="0.01"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !actualBalance}>
                {isPending ? "Checking…" : "Check"}
              </Button>
            </DialogFooter>
          </form>
        ) : result.autoCorreted ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              Delta of {formatMoney(result.delta)} — logged automatically as a correcting entry. Tracked was
              {formatMoney(result.tracked)}, now matches the {formatMoney(result.actual)} you entered.
            </p>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-destructive">
              Delta of {formatMoney(result.delta)} — over the audit threshold. No automatic correction was
              made; review what changed since the last reconciliation, or proceed from memory and
              log a correcting entry yourself (PRD §3).
            </p>
            {transactionsSinceLastSnapshot.length > 0 ? (
              <ul className="max-h-48 overflow-y-auto rounded-md border p-2">
                {transactionsSinceLastSnapshot.map((t) => (
                  <li key={t.id} className="flex justify-between border-b py-1 last:border-0">
                    <span>
                      {t.date} — {t.type}
                    </span>
                    <span className="font-mono">{formatMoney(t.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">No transactions logged since the last reconciliation.</p>
            )}
            <Button onClick={() => handleClose(false)}>Done reviewing</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
