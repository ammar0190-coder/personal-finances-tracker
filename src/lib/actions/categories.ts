"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/data/categories";

export interface CreateCategoryInput {
  name: string;
  kind: "expense" | "income";
  parentId?: string;
}

export async function createCategory(input: CreateCategoryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: input.name,
    kind: input.kind,
    parent_id: input.parentId || null,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}

/** Soft-delete, per PRD §4/§12 — same rule as accounts. */
export async function deactivateCategory(categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ active: false }).eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

/**
 * Onboarding's starter template (PRD §3.1) — only ever called when a user
 * has zero categories, so it can never silently re-seed over edits.
 */
export async function seedDefaultCategories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  if (count && count > 0) return;

  const rows: Array<{
    user_id: string;
    name: string;
    kind: "expense" | "income";
    parent_id: string | null;
  }> = [];

  for (const { name } of DEFAULT_EXPENSE_CATEGORIES) {
    rows.push({ user_id: user.id, name, kind: "expense", parent_id: null });
  }
  for (const name of DEFAULT_INCOME_CATEGORIES) {
    rows.push({ user_id: user.id, name, kind: "income", parent_id: null });
  }

  const { data: parents, error: parentError } = await supabase.from("categories").insert(rows).select();
  if (parentError) throw parentError;

  const subcategoryRows: Array<{
    user_id: string;
    name: string;
    kind: "expense";
    parent_id: string;
  }> = [];
  for (const { name: parentName, subcategories } of DEFAULT_EXPENSE_CATEGORIES) {
    const parent = parents!.find((p) => p.name === parentName);
    if (!parent) continue;
    for (const sub of subcategories) {
      subcategoryRows.push({ user_id: user.id, name: sub, kind: "expense", parent_id: parent.id });
    }
  }
  if (subcategoryRows.length > 0) {
    const { error: subError } = await supabase.from("categories").insert(subcategoryRows);
    if (subError) throw subError;
  }

  revalidatePath("/", "layout");
}
