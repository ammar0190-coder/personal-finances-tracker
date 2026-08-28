import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

/**
 * The starter template shipped in onboarding (PRD §3.1, §4) — editable
 * afterward, never re-applied once a user has any categories of their own.
 */
export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; subcategories: string[] }> = [
  { name: "Travel", subcategories: ["Auto", "Metro"] },
  { name: "Food", subcategories: ["Swiggy/Zomato", "Office food", "Dining out"] },
  { name: "Shopping", subcategories: ["Clothes", "Home", "Electronics", "Personal care"] },
  { name: "House", subcategories: ["Rent", "Utilities", "Other home"] },
  { name: "Leisure", subcategories: [] },
  { name: "Miscellaneous", subcategories: [] },
];

export const DEFAULT_INCOME_CATEGORIES: string[] = ["Salary", "Misc income"];

export async function listCategories(
  options: { kind?: "expense" | "income"; includeInactive?: boolean } = {},
): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("name", { ascending: true });
  if (options.kind) query = query.eq("kind", options.kind);
  if (!options.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
