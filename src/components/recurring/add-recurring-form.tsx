"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRecurringTemplate } from "@/lib/actions/recurring";
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
import { CategorySelect } from "@/components/transactions/category-select";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";
import type { Instrument } from "@/lib/data/instruments";

const TODAY = new Date().toISOString().slice(0, 10);
type Kind = "expense" | "income" | "investment";

/** PRD §5/§6: category, account, amount, and frequency — also covers SIPs against an Instrument. */
export function AddRecurringForm({
  accounts,
  categories,
  instruments = [],
}: {
  accounts: Account[];
  categories: Category[];
  instruments?: Instrument[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "annual" | "custom">("monthly");
  const [customIntervalDays, setCustomIntervalDays] = useState("");
  const [nextDueDate, setNextDueDate] = useState(TODAY);

  const isInvestment = kind === "investment";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createRecurringTemplate({
          kind,
          accountId,
          categoryId: isInvestment ? undefined : categoryId,
          instrumentId: isInvestment ? instrumentId : undefined,
          amount,
          frequency,
          customIntervalDays: frequency === "custom" ? Number(customIntervalDays) : undefined,
          nextDueDate,
        });
        setAmount("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create that recurring item.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label>Kind</Label>
        <Select value={kind} onValueChange={(v) => setKind((v ?? "expense") as Kind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Recurring expense</SelectItem>
            <SelectItem value="income">Recurring income (e.g. Salary)</SelectItem>
            {instruments.length > 0 && <SelectItem value="investment">SIP (recurring investment)</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isInvestment ? (
        <div className="grid gap-2">
          <Label>Instrument</Label>
          <Select value={instrumentId} onValueChange={(v) => setInstrumentId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an instrument" />
            </SelectTrigger>
            <SelectContent>
              {instruments.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>Category</Label>
          <CategorySelect categories={categories} kind={kind === "income" ? "income" : "expense"} value={categoryId} onChange={setCategoryId} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rec-amount">Amount</Label>
          <Input
            id="rec-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rec-next-due">First due date</Label>
          <Input id="rec-next-due" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency((v ?? "monthly") as typeof frequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
            <SelectItem value="custom">Custom interval</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {frequency === "custom" && (
        <div className="grid gap-2">
          <Label htmlFor="rec-interval">Every how many days?</Label>
          <Input
            id="rec-interval"
            type="number"
            min="1"
            value={customIntervalDays}
            onChange={(e) => setCustomIntervalDays(e.target.value)}
          />
        </div>
      )}
      <Button
        type="submit"
        disabled={isPending || !accountId || !amount || (isInvestment ? !instrumentId : !categoryId)}
      >
        {isPending ? "Adding…" : "Add recurring item"}
      </Button>
    </form>
  );
}
