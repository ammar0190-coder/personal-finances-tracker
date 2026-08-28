import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Account = Database["public"]["Tables"]["accounts"]["Row"];

/** Every account for the current user. PRD §3. */
export async function listAccounts(options: { includeInactive?: boolean } = {}): Promise<Account[]> {
  const supabase = await createClient();
  let query = supabase.from("accounts").select("*").order("created_at", { ascending: true });
  if (!options.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
