"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editTransaction } from "@/lib/actions/transactions";
import { toMoneyString } from "@/lib/ledger/money";
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
import type { Transaction } from "@/lib/data/transactions";
import { toOptions } from "@/lib/select-options";

/**
 * PRD §12 "Edit transaction": amount, date, category, account, and note are
 * all editable in place. `type` is deliberately not offered here — a wrong
 * type is a delete-and-relog, per CLAUDE.md.
 */
export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(transaction.account_id);
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [amount, setAmount] = useState(toMoneyString(transaction.amount));
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note ?? "");

  const kind = transaction.type === "income" ? "income" : "expense";
  const showCategory = transaction.type === "expense" || transaction.type === "income";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await editTransaction(transaction.id, {
          accountId,
          categoryId: showCategory ? categoryId : undefined,
          amount,
          date,
          note: note || null,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that edit.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-muted-foreground hover:text-foreground text-xs underline">
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {transaction.type}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="grid gap-2">
            <Label>Account</Label>
            <Select items={toOptions(accounts, (a) => a.name)} value={accountId} onValueChange={(v) => setAccountId(v ?? accountId)}>
              <SelectTrigger>
                <SelectValue />
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
          {showCategory && (
            <div className="grid gap-2">
              <Label>Category</Label>
              <CategorySelect categories={categories} kind={kind} value={categoryId} onChange={setCategoryId} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-note">Note</Label>
            <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
