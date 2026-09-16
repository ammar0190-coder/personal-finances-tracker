"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { flagExpenseAsReimbursable } from "@/lib/actions/iou";
import { formatMoney } from "@/lib/ledger/format";
import { toMoneyString } from "@/lib/ledger/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction } from "@/lib/data/transactions";
import { toOptions } from "@/lib/select-options";

const TODAY = new Date().toISOString().slice(0, 10);

/** PRD §7/§12 "Flagging an expense as reimbursable" — any expense, any category, after the fact. */
export function FlagReimbursementForm({ recentExpenses }: { recentExpenses: Transaction[] }) {
  const router = useRouter();
  const expenseOptions = toOptions(
    recentExpenses,
    (t) => `${t.date} — ${formatMoney(t.amount)}${t.note ? ` (${t.note})` : ""}`,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [personName, setPersonName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");

  const selected = recentExpenses.find((t) => t.id === transactionId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await flagExpenseAsReimbursable({
          transactionId,
          personName: personName || "Company",
          expectedAmount: expectedAmount || toMoneyString(selected!.amount),
          date: TODAY,
        });
        setTransactionId("");
        setPersonName("");
        setExpectedAmount("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't flag that.");
      }
    });
  }

  if (recentExpenses.length === 0) {
    return <p className="text-muted-foreground text-sm">Log an expense first, then flag it here.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label>Which expense</Label>
        <Select items={expenseOptions} value={transactionId} onValueChange={(v) => setTransactionId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an expense" />
          </SelectTrigger>
          <SelectContent>
            {expenseOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="reimb-payer">Who&apos;ll pay it back</Label>
          <Input id="reimb-payer" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Company" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reimb-amount">Expected amount</Label>
          <Input
            id="reimb-amount"
            type="number"
            step="0.01"
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(e.target.value)}
            placeholder={selected ? toMoneyString(selected.amount) : "full amount"}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending || !transactionId}>
        {isPending ? "Flagging…" : "Flag as reimbursable"}
      </Button>
    </form>
  );
}
