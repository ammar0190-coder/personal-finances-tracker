"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AccountType = Database["public"]["Enums"]["account_type"];

export interface CreateAccountInput {
  name: string;
  institution?: string;
  role?: string;
  accountType: AccountType;
  isSpendAccount?: boolean;
  isSavings?: boolean;
}

export async function createAccount(input: CreateAccountInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: input.name,
    institution: input.institution || null,
    role: input.role || null,
    account_type: input.accountType,
    is_spend_account: input.isSpendAccount ?? false,
    is_savings: input.isSavings ?? false,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}

/** "Deleting" an account, per PRD §3/§12: soft-delete only, never a real row removal. */
export async function deactivateAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ active: false }).eq("id", accountId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function reactivateAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ active: true }).eq("id", accountId);
  if (error) throw error;
  revalidatePath("/", "layout");
}
