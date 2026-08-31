"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeIouEntry } from "@/lib/actions/iou-shared";

/**
 * PRD §7/§12 "IOU payable creation": logged directly as an IOU_Entries row,
 * no Transactions row yet — nothing touches balance or spend at this point.
 */
export async function createPayable(input: { personName: string; amountOwed: string; dateIncurred: string; note?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("iou_entries").insert({
    user_id: user.id,
    direction: "payable",
    person_name: input.personName,
    amount_owed: input.amountOwed as unknown as number,
    date_incurred: input.dateIncurred,
    note: input.note || null,
  });
  if (error) throw error;
  revalidatePath("/iou");
}

/**
 * PRD §10.8: account selection is always explicit, never defaulted — the
 * caller passes `accountId` every time, whichever kind of settlement this is.
 */
async function recordSettlementTransaction(
  entryId: string,
  transactionType: "iou_repayment" | "iou_settlement",
  input: { amount: string; accountId: string; date: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: transactionType,
    account_id: input.accountId,
    related_iou_entry_id: entryId,
    amount: input.amount as unknown as number,
    date: input.date,
  });
  if (error) throw error;

  await recomputeIouEntry(supabase, entryId);
  revalidatePath("/", "layout");
  revalidatePath("/iou");
}

/** PRD §12 "IOU repayment (receivable)" — also used for a Reimbursement received (§10.8). */
export async function recordRepayment(entryId: string, input: { amount: string; accountId: string; date: string }) {
  return recordSettlementTransaction(entryId, "iou_repayment", input);
}

/** PRD §12 "IOU settlement (payable)" — counts as real spend, unlike a Receivable repayment. */
export async function recordSettlement(entryId: string, input: { amount: string; accountId: string; date: string }) {
  return recordSettlementTransaction(entryId, "iou_settlement", input);
}

/** PRD §7/§12 "Flagging an expense as reimbursable". */
export async function flagExpenseAsReimbursable(input: { transactionId: string; expectedAmount: string; personName: string; date: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("iou_entries").insert({
    user_id: user.id,
    direction: "reimbursement",
    reimbursed_transaction_id: input.transactionId,
    person_name: input.personName,
    amount_owed: input.expectedAmount as unknown as number,
    date_incurred: input.date,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
  revalidatePath("/iou");
}

/** PRD §7: any pending/partial Receivable, Payable, or Reimbursement can be written off. */
export async function writeOffEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("iou_entries").update({ status: "written_off" }).eq("id", entryId);
  if (error) throw error;
  revalidatePath("/iou");
  revalidatePath("/", "layout");
}
