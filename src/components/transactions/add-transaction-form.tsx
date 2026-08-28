"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/actions/transactions";
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
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";

const TODAY = new Date().toISOString().slice(0, 10);

export function AddTransactionForm({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState("");

  const relevantCategories = categories.filter((c) => c.kind === type && !c.parent_id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createTransaction({ type, accountId, categoryId, amount, date, note: note || undefined });
        setAmount("");
        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't log that.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
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
      <div className="grid gap-2">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {relevantCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="txn-amount">Amount</Label>
          <Input
            id="txn-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-date">Date</Label>
          <Input id="txn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="txn-note">Note (optional)</Label>
        <Input id="txn-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" disabled={isPending || !accountId || !categoryId || !amount}>
        {isPending ? "Logging…" : `Log ${type}`}
      </Button>
    </form>
  );
}
