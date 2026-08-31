import { Decimal } from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { toMoneyString } from "@/lib/ledger/money";
import type { Database } from "@/types/database";

export type IouEntry = Database["public"]["Tables"]["iou_entries"]["Row"];

async function listByDirection(direction: "receivable" | "payable" | "reimbursement"): Promise<IouEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("iou_entries")
    .select("*")
    .eq("direction", direction)
    .order("date_incurred", { ascending: false });
  if (error) throw error;
  return data;
}

export const listReceivables = () => listByDirection("receivable");
export const listPayables = () => listByDirection("payable");
export const listReimbursements = () => listByDirection("reimbursement");

/**
 * PRD §8 Dashboard "IOU snapshot": net Receivable and net Payable totals,
 * written-off entries excluded (§7). Net = amount_owed − amount_settled,
 * summed only over entries that are still pending/partial.
 */
export async function getIouSnapshot(): Promise<{ netReceivable: string; netPayable: string }> {
  const [receivables, payables] = await Promise.all([listReceivables(), listPayables()]);

  function netOutstanding(entries: IouEntry[]): Decimal {
    return entries
      .filter((e) => e.status === "pending" || e.status === "partial")
      .reduce((sum, e) => sum.plus(toMoneyString(e.amount_owed)).minus(toMoneyString(e.amount_settled)), new Decimal(0));
  }

  return {
    netReceivable: netOutstanding(receivables).toString(),
    netPayable: netOutstanding(payables).toString(),
  };
}
