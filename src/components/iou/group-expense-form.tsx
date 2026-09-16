"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupExpense } from "@/lib/actions/group-expenses";
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
import { toOptions } from "@/lib/select-options";

const TODAY = new Date().toISOString().slice(0, 10);

/** PRD §7 "Group Expense flow". */
export function GroupExpenseForm({ accounts, leisureCategories }: { accounts: Account[]; leisureCategories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedAccountId, setAccountId] = useState("");
  const [pickedCategoryId, setCategoryId] = useState("");
  // Default to the first option until one is picked; derived so the default
  // still applies to options that appear after this form mounted.
  const accountId = pickedAccountId || accounts[0]?.id || "";
  const categoryId = pickedCategoryId || leisureCategories[0]?.id || "";
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState("");
  const [participants, setParticipants] = useState<Array<{ personName: string; amount: string }>>([
    { personName: "", amount: "" },
  ]);

  function updateParticipant(index: number, field: "personName" | "amount", value: string) {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function splitEqually() {
    if (!totalAmount || participants.length === 0) return;
    // headcount includes the user (§7) — divide by participants + 1, since
    // `participants` here holds only the OTHER people.
    const each = (Number(totalAmount) / (participants.length + 1)).toFixed(2);
    setParticipants((prev) => prev.map((p) => ({ ...p, amount: each })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = participants.filter((p) => p.personName && p.amount);
    if (valid.length === 0) {
      setError("Add at least one participant with a name and amount.");
      return;
    }
    startTransition(async () => {
      try {
        await createGroupExpense({
          accountId,
          categoryId,
          totalAmount,
          date,
          note: note || undefined,
          splitMethod: "custom",
          participants: valid,
        });
        setTotalAmount("");
        setNote("");
        setParticipants([{ personName: "", amount: "" }]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't log that group expense.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Paying account</Label>
          <Select items={toOptions(accounts, (a) => a.name)} value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
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
          <Label htmlFor="ge-total">Total amount</Label>
          <Input id="ge-total" type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
        </div>
      </div>
      {leisureCategories.length > 0 && (
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select items={toOptions(leisureCategories, (c) => c.name)} value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {leisureCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Participants (their share only — your own share isn&apos;t entered)</Label>
          <button type="button" onClick={splitEqually} className="text-muted-foreground text-xs underline">
            Split equally
          </button>
        </div>
        {participants.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Name" value={p.personName} onChange={(e) => updateParticipant(i, "personName", e.target.value)} />
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={p.amount}
              onChange={(e) => updateParticipant(i, "amount", e.target.value)}
              className="w-32"
            />
            <button
              type="button"
              onClick={() => setParticipants((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setParticipants((prev) => [...prev, { personName: "", amount: "" }])}
          className="text-muted-foreground w-fit text-xs underline"
        >
          + Add participant
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ge-date">Date</Label>
          <Input id="ge-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ge-note">Note</Label>
          <Input id="ge-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={isPending || !accountId || !categoryId || !totalAmount}>
        {isPending ? "Logging…" : "Log group expense"}
      </Button>
    </form>
  );
}
