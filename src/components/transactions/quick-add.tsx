"use client";

import { useState } from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";

type TxnType = "expense" | "income" | "transfer";

const TITLES: Record<TxnType, string> = {
  expense: "Add expense",
  income: "Add income",
  transfer: "Transfer money",
};

/**
 * PRD §8's quick-add shortcut: log an expense from the Dashboard without
 * navigating into a separate page.
 *
 * Expense is the prominent action because it is overwhelmingly the common case;
 * income and transfer sit behind the adjacent menu rather than competing with
 * it. Before M8 the whole transaction form sat inline on the Dashboard, which
 * is the opposite of a shortcut.
 *
 * Investment contributions are deliberately not here — they need an instrument
 * to point at, and that lives in the Investments module (PRD §6).
 *
 * The form keeps its batch flow: "Add another line" still builds up several
 * lines and saves them together, which PRD §1 calls a first-class flow.
 */
export function QuickAdd({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [openType, setOpenType] = useState<TxnType | null>(null);

  return (
    <div className="flex items-center">
      <Dialog open={openType !== null} onOpenChange={(open) => !open && setOpenType(null)}>
        <DialogTrigger
          render={
            <Button className="rounded-r-none pr-3" onClick={() => setOpenType("expense")}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Add expense
            </Button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button aria-label="Other transaction types" className="rounded-l-none border-l border-l-primary-foreground/25 px-2">
                <ChevronDownIcon className="size-4" aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setOpenType("income")}>Income</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenType("transfer")}>Transfer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openType ? TITLES[openType] : TITLES.expense}</DialogTitle>
          </DialogHeader>
          {openType && (
            <AddTransactionForm
              accounts={accounts}
              categories={categories}
              initialType={openType}
              onSaved={() => setOpenType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
