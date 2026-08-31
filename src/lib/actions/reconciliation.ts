"use server";

import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTrackedBalance } from "@/lib/data/reconciliation";

/** PRD §3/§10.10: deltas over ~₹500 trigger a manual audit instead of an automatic correcting entry. */
const AUDIT_THRESHOLD = 500;

export interface ReconcileResult {
  delta: string;
  tracked: string;
  actual: string;
  autoCorreted: boolean;
}

/**
 * PRD §10.10 "Reconciliation Corrections": delta = actual − tracked. A
 * small delta auto-corrects (Misc income if actual > tracked, Misc expense
 * if actual < tracked); a delta over the audit threshold does NOT
 * auto-create a transaction — the caller (UI) shows the manual-audit flow
 * from `getTransactionsSinceLastSnapshot` instead.
 */
export async function reconcileAccount(accountId: string, actualBalance: string, date: string): Promise<ReconcileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const tracked = await getTrackedBalance(accountId);
  const delta = new Decimal(actualBalance).minus(tracked);
  const autoCorrect = delta.abs().lessThan(AUDIT_THRESHOLD);

  let correctingTransactionId: string | null = null;

  if (autoCorrect && !delta.isZero()) {
    const correctingType = delta.greaterThan(0) ? "income" : "expense";
    const categoryName = correctingType === "income" ? "Misc income" : "Miscellaneous";
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("kind", correctingType)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) {
      throw new Error(`No "${categoryName}" category found to log the correction against — create one first.`);
    }

    const { data: correctingTxn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: correctingType,
        account_id: accountId,
        category_id: category.id,
        amount: delta.abs().toString() as unknown as number,
        date,
        note: "Reconciliation correction",
      })
      .select()
      .single();
    if (txnError) throw txnError;
    correctingTransactionId = correctingTxn.id;
  }

  const { error: snapshotError } = await supabase.from("balance_snapshots").insert({
    user_id: user.id,
    account_id: accountId,
    date,
    actual_balance: actualBalance as unknown as number,
    tracked_balance_at_time: tracked as unknown as number,
    correcting_transaction_id: correctingTransactionId,
  });
  if (snapshotError) throw snapshotError;

  revalidatePath("/", "layout");

  return { delta: delta.toString(), tracked, actual: actualBalance, autoCorreted: autoCorrect };
}
