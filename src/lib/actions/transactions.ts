"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeIouEntry } from "@/lib/actions/iou-shared";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

export interface CreateTransactionInput {
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  amount: string;
  date: string;
  note?: string;
}

export async function createTransaction(input: CreateTransactionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: input.type,
    account_id: input.accountId,
    to_account_id: input.toAccountId || null,
    category_id: input.categoryId || null,
    // Generated types say `number`, but Postgres accepts a JSON string for a
    // numeric column and casts it exactly — no float intermediate on the way
    // in. This cast doesn't touch the runtime value; see lib/ledger/money.ts.
    amount: input.amount as unknown as number,
    date: input.date,
    note: input.note || null,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}

/**
 * Edit a transaction (PRD §12). `type` is deliberately not editable here —
 * changing it is a delete-and-relog, per CLAUDE.md's conventions.
 */
export interface EditTransactionInput {
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  amount?: string;
  date?: string;
  note?: string | null;
}

export async function editTransaction(transactionId: string, input: EditTransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      // See the create-side comment above on this cast.
      amount: input.amount as unknown as number | undefined,
      date: input.date,
      note: input.note,
    })
    .eq("id", transactionId);
  if (error) throw error;

  // PRD §10.8: editing an iou_repayment/iou_settlement recomputes the entry
  // it settles — never left to drift out of sync with what actually posted.
  const { data: txn } = await supabase.from("transactions").select("type, related_iou_entry_id").eq("id", transactionId).single();
  if (txn?.related_iou_entry_id && (txn.type === "iou_repayment" || txn.type === "iou_settlement")) {
    await recomputeIouEntry(supabase, txn.related_iou_entry_id);
  }

  revalidatePath("/", "layout");
  revalidatePath("/iou");
}

/**
 * Delete a transaction (PRD §12). Blocked with a plain-language explanation
 * if anything depends on it — a Group Expense anchor, a refund's original,
 * or a reimbursement's original — rather than the raw FK-restrict error the
 * database would otherwise surface.
 */
export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();

  const [{ data: groupExpense }, { data: refundsOfThis }, { data: reimbursementsOfThis }, { data: self }] = await Promise.all([
    supabase.from("group_expenses").select("id").eq("transaction_id", transactionId).maybeSingle(),
    supabase.from("transactions").select("id").eq("refunded_transaction_id", transactionId).limit(1),
    supabase.from("iou_entries").select("id").eq("reimbursed_transaction_id", transactionId).limit(1),
    supabase.from("transactions").select("type, related_iou_entry_id").eq("id", transactionId).single(),
  ]);

  if (groupExpense) {
    throw new Error(
      "This is the anchor expense of a Group Expense. Delete the Group Expense itself instead of this transaction alone.",
    );
  }
  if (refundsOfThis && refundsOfThis.length > 0) {
    throw new Error("A refund is linked to this transaction. Delete the refund first.");
  }
  if (reimbursementsOfThis && reimbursementsOfThis.length > 0) {
    throw new Error("A reimbursement is linked to this transaction. Resolve it first.");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) throw error;

  // PRD §10.8: deleting an iou_repayment/iou_settlement recomputes the
  // entry it settled, same as an edit — see editTransaction above.
  if (self?.related_iou_entry_id && (self.type === "iou_repayment" || self.type === "iou_settlement")) {
    await recomputeIouEntry(supabase, self.related_iou_entry_id);
  }

  revalidatePath("/", "layout");
  revalidatePath("/iou");
}
