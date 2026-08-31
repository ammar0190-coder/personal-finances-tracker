import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type RecurringTemplate = Database["public"]["Tables"]["recurring_templates"]["Row"];

export async function listRecurringTemplates(options: { includeInactive?: boolean } = {}): Promise<RecurringTemplate[]> {
  const supabase = await createClient();
  let query = supabase.from("recurring_templates").select("*").order("next_due_date", { ascending: true });
  if (!options.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** PRD §5: surfaces for confirmation on the due date — due today or overdue. */
export async function listDueRecurringTemplates(today: string = new Date().toISOString().slice(0, 10)) {
  const templates = await listRecurringTemplates();
  return templates.filter((t) => t.next_due_date <= today);
}
