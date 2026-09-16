"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, type CreateTransactionInput } from "@/lib/actions/transactions";
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
import { TRANSACTION_TYPE_OPTIONS, toOptions } from "@/lib/select-options";
import { formatMoney } from "@/lib/ledger/format";

const TODAY = new Date().toISOString().slice(0, 10);

type DraftLine = CreateTransactionInput & { key: string; label: string };
type TxnType = "expense" | "income" | "transfer";

export function AddTransactionForm({
  accounts,
  categories,
  initialType = "expense",
  onSaved,
}: {
  accounts: Account[];
  categories: Category[];
  /** Which type the form opens on — the quick-add menu picks this. A
   *  transaction's type stays immutable after creation (PRD §12); this only
   *  chooses the starting point of a new one. */
  initialType?: TxnType;
  /** Called after a successful save, so a dialog can close itself. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const accountOptions = toOptions(accounts, (a) => a.name);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<TxnType>(initialType);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState("");
  const [batch, setBatch] = useState<DraftLine[]>([]);

  const isTransfer = type === "transfer";

  // Pure — safe to call during render (e.g. for `disabled`). No id
  // generation here; see buildLine for that, called only from handlers.
  function isValidLine(): boolean {
    if (!accountId || !amount) return false;
    if (isTransfer) return Boolean(toAccountId) && toAccountId !== accountId;
    return Boolean(categoryId);
  }

  // Impure (generates a batch key) — only ever called from an event handler.
  function buildLine(): DraftLine | null {
    if (!isValidLine()) return null;
    if (isTransfer) {
      return {
        key: `${Date.now()}-${Math.random()}`,
        type: "transfer",
        accountId,
        toAccountId,
        amount,
        date,
        note: note || undefined,
        label: `Transfer to ${accounts.find((a) => a.id === toAccountId)?.name ?? "?"}`,
      };
    }
    const category = categories.find((c) => c.id === categoryId);
    return {
      key: `${Date.now()}-${Math.random()}`,
      type,
      accountId,
      categoryId,
      amount,
      date,
      note: note || undefined,
      label: category?.name ?? "?",
    };
  }

  function resetLineFields() {
    setAmount("");
    setNote("");
  }

  function handleLogNow(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const line = buildLine();
    if (!line) return;
    startTransition(async () => {
      try {
        await createTransaction(line);
        resetLineFields();
        router.refresh();
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't log that.");
      }
    });
  }

  function handleAddToBatch() {
    setError(null);
    const line = buildLine();
    if (!line) return;
    setBatch((b) => [...b, line]);
    resetLineFields();
  }

  function removeFromBatch(key: string) {
    setBatch((b) => b.filter((l) => l.key !== key));
  }

  function handleSaveBatch() {
    setError(null);
    startTransition(async () => {
      try {
        for (const line of batch) {
          await createTransaction(line);
        }
        setBatch([]);
        router.refresh();
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the batch.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleLogNow} aria-label="Log a transaction" className="flex flex-col gap-4">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="grid gap-2">
          <Label htmlFor="txn-type">Type</Label>
          <Select items={TRANSACTION_TYPE_OPTIONS} value={type} onValueChange={(v) => setType((v ?? "expense") as TxnType)}>
            <SelectTrigger id="txn-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-account">{isTransfer ? "From account" : "Account"}</Label>
          <Select items={accountOptions} value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
            <SelectTrigger id="txn-account">
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
        {isTransfer ? (
          <div className="grid gap-2">
            <Label htmlFor="txn-to-account">To account</Label>
            <Select items={accountOptions} value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
              <SelectTrigger id="txn-to-account">
                <SelectValue placeholder="Choose a destination account" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="txn-category">Category</Label>
            <CategorySelect
              id="txn-category"
              categories={categories}
              kind={type === "income" ? "income" : "expense"}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>
        )}
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
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-date">Date</Label>
            <Input id="txn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-note">Note (optional)</Label>
          <Input id="txn-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending || !isValidLine()} className="flex-1">
            {isPending ? "Logging…" : `Log ${type} now`}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isValidLine()}
            onClick={handleAddToBatch}
          >
            Add to end-of-day batch
          </Button>
        </div>
      </form>

      {batch.length > 0 && (
        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-medium">
            End-of-day batch — {batch.length} item{batch.length > 1 ? "s" : ""}
          </p>
          <ul className="mb-3 flex flex-col gap-1">
            {batch.map((line) => (
              <li key={line.key} className="flex items-center justify-between text-sm">
                <span>
                  {line.label} — {formatMoney(line.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromBatch(line.key)}
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" onClick={handleSaveBatch} disabled={isPending}>
            {isPending ? "Saving…" : `Save all ${batch.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}
