"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeNextDueDate } from "@/lib/ledger/recurring";
import type { Database } from "@/types/database";

type RecurringFrequency = Database["public"]["Enums"]["recurring_frequency"];
type RecurringKind = Database["public"]["Enums"]["recurring_kind"];

export interface CreateRecurringTemplateInput {
  kind: RecurringKind;
  accountId: string;
  amount: string;
  frequency: RecurringFrequency;
  customIntervalDays?: number;
  nextDueDate: string;
  /** Required for kind = expense | income. PRD §11's category_required_for_expense_income_kind. */
  categoryId?: string;
  /** Required for kind = investment (SIP, §6). */
  instrumentId?: string;
  quantity?: string;
}

export async function createRecurringTemplate(input: CreateRecurringTemplateInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("recurring_templates").insert({
    user_id: user.id,
    kind: input.kind,
    category_id: input.kind === "investment" ? null : (input.categoryId ?? null),
    instrument_id: input.kind === "investment" ? (input.instrumentId ?? null) : null,
    quantity: (input.kind === "investment" ? input.quantity || null : null) as unknown as number | null,
    account_id: input.accountId,
    amount: input.amount as unknown as number,
    frequency: input.frequency,
    custom_interval_days: input.frequency === "custom" ? (input.customIntervalDays ?? null) : null,
    next_due_date: input.nextDueDate,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
  revalidatePath("/investments");
}

/**
 * PRD §5 "Confirm-before-posting": the item surfaces for confirmation on its
 * due date rather than silently logging, with the amount editable at that
 * moment. Posts a real Transaction, then advances next_due_date per §10.11.
 * Covers SIPs (§6) too — same mechanism, an investment-kind template posts
 * an `investment` transaction instead of an expense/income one.
 */
export async function confirmRecurringPosting(templateId: string, confirmedAmount: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: template, error: templateError } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (templateError) throw templateError;

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: template.kind,
    account_id: template.account_id,
    category_id: template.category_id,
    instrument_id: template.instrument_id,
    quantity: template.quantity,
    amount: confirmedAmount as unknown as number,
    date: template.next_due_date,
    recurring_template_id: template.id,
  });
  if (insertError) throw insertError;

  const nextDueDate = computeNextDueDate(
    template.next_due_date,
    template.frequency,
    template.custom_interval_days ?? undefined,
  );

  const { error: updateError } = await supabase
    .from("recurring_templates")
    .update({ next_due_date: nextDueDate, amount: confirmedAmount as unknown as number })
    .eq("id", templateId);
  if (updateError) throw updateError;

  revalidatePath("/", "layout");
  revalidatePath("/investments");
}

export async function deactivateRecurringTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_templates").update({ active: false }).eq("id", templateId);
  if (error) throw error;
  revalidatePath("/", "layout");
}
