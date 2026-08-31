"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateGroupExpenseInput {
  accountId: string;
  categoryId: string;
  totalAmount: string;
  date: string;
  note?: string;
  splitMethod: "equal" | "custom";
  /** Other participants' shares — PRD §7: need not sum to totalAmount, the gap is the user's own share. */
  participants: Array<{ personName: string; amount: string }>;
}

/**
 * PRD §7/§12 "Group Expense (creates Receivables)": the full amount deducts
 * immediately as a normal expense, then one Receivable per participant.
 */
export async function createGroupExpense(input: CreateGroupExpenseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (input.participants.length === 0) throw new Error("Add at least one participant.");

  const { data: transaction, error: txnError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      account_id: input.accountId,
      category_id: input.categoryId,
      amount: input.totalAmount as unknown as number,
      date: input.date,
      note: input.note || null,
    })
    .select()
    .single();
  if (txnError) throw txnError;

  const { data: groupExpense, error: geError } = await supabase
    .from("group_expenses")
    .insert({
      user_id: user.id,
      transaction_id: transaction.id,
      total_amount: input.totalAmount as unknown as number,
      split_method: input.splitMethod,
    })
    .select()
    .single();
  if (geError) throw geError;

  const { error: entriesError } = await supabase.from("iou_entries").insert(
    input.participants.map((p) => ({
      user_id: user.id,
      direction: "receivable" as const,
      group_expense_id: groupExpense.id,
      person_name: p.personName,
      amount_owed: p.amount as unknown as number,
      date_incurred: input.date,
    })),
  );
  if (entriesError) throw entriesError;

  revalidatePath("/", "layout");
  revalidatePath("/iou");
}

/**
 * PRD §12 "Delete Group Expense": a full, confirmed teardown — the
 * transaction, the Group_Expenses row, every IOU_Entries row it spawned,
 * and any repayments already logged against them, all removed together.
 *
 * Order matters: `transactions.related_iou_entry_id` is ON DELETE RESTRICT
 * (deliberately, so an ordinary delete can't silently orphan a repayment —
 * see the migration's comments), so repayment transactions must be deleted
 * explicitly *before* the IOU entries they reference, even though
 * `group_expenses -> iou_entries` and `transactions -> group_expenses` both
 * cascade on their own.
 */
export async function deleteGroupExpense(groupExpenseId: string) {
  const supabase = await createClient();

  const { data: groupExpense, error: geError } = await supabase
    .from("group_expenses")
    .select("id, transaction_id")
    .eq("id", groupExpenseId)
    .single();
  if (geError) throw geError;

  const { data: entries, error: entriesError } = await supabase
    .from("iou_entries")
    .select("id")
    .eq("group_expense_id", groupExpenseId);
  if (entriesError) throw entriesError;

  const entryIds = entries.map((e) => e.id);
  if (entryIds.length > 0) {
    const { error: repaymentsError } = await supabase.from("transactions").delete().in("related_iou_entry_id", entryIds);
    if (repaymentsError) throw repaymentsError;
  }

  // Cascades to the group_expenses row and its (now repayment-free) iou_entries.
  const { error: deleteError } = await supabase.from("transactions").delete().eq("id", groupExpense.transaction_id);
  if (deleteError) throw deleteError;

  revalidatePath("/", "layout");
  revalidatePath("/iou");
}
