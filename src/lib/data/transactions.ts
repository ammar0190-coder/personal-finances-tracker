import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

/** All transactions for the current user, most recent first. */
export async function listTransactions(
  options: { accountId?: string; limit?: number } = {},
): Promise<Transaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (options.accountId) {
    query = query.or(`account_id.eq.${options.accountId},to_account_id.eq.${options.accountId}`);
  }
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
