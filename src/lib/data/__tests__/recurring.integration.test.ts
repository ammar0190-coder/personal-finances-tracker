/**
 * Live verification of PRD §5 "confirm-before-posting" and §10.11's
 * next_due_date advancement, against real Postgres. Replicates exactly what
 * `confirmRecurringPosting` (src/lib/actions/recurring.ts) does — that
 * action itself can't be called here since it needs a real Next.js request
 * for cookies(), but every database interaction it performs is exercised.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeNextDueDate } from "@/lib/ledger/recurring";
import { findCurrentCycleStart } from "@/lib/ledger/cycle";
import { computePeriodSpend } from "@/lib/ledger/spend";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";
import { insertOne } from "./helpers/insert";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Recurring templates (PRD §5, §10.11), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let spendId: string;
  let categoryId: string;

  beforeAll(async () => {
    const email = `recurring-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: "test-password-123",
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user!.id;

    client = createAdminClient<Database>(URL, PUBLISHABLE_KEY);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: "test-password-123" });
    if (signInError) throw signInError;

    const bank = await insertOne(
      client
        .from("accounts")
        .insert({ user_id: userId, name: "Bank", account_type: "bank" })
        .select()
        .single(),
      "accounts/Bank",
    );
    bankId = bank.id;

    const spend = await insertOne(
      client
        .from("accounts")
        .insert({ user_id: userId, name: "Spend", account_type: "bank", is_spend_account: true })
        .select()
        .single(),
      "accounts/Spend",
    );
    spendId = spend.id;

    const category = await insertOne(
      client
        .from("categories")
        .insert({ user_id: userId, name: "Rent", kind: "expense" })
        .select()
        .single(),
      "categories/Rent",
    );
    categoryId = category.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("confirming a due template posts a transaction and advances next_due_date by one month", async () => {
    const template = await insertOne(
      client
        .from("recurring_templates")
        .insert({
        user_id: userId,
        kind: "expense",
        category_id: categoryId,
        account_id: bankId,
        amount: 15000,
        frequency: "monthly",
        next_due_date: "2026-01-31",
        })
        .select()
        .single(),
      "recurring_templates",
    );

    // The action's own logic, exercised directly:
    const confirmedAmount = "15500"; // user bumped it at confirm time, per §5
    await client.from("transactions").insert({
      user_id: userId,
      type: template.kind,
      account_id: template.account_id,
      category_id: template.category_id,
      amount: confirmedAmount as unknown as number,
      date: template.next_due_date,
      recurring_template_id: template.id,
    });
    const nextDueDate = computeNextDueDate(template.next_due_date, template.frequency, template.custom_interval_days ?? undefined);
    await client.from("recurring_templates").update({ next_due_date: nextDueDate, amount: confirmedAmount as unknown as number }).eq("id", template.id);

    // Feb 2026 isn't a leap year — the 31st clamps to the 28th (PRD §10.11).
    const { data: updatedTemplate } = await client.from("recurring_templates").select("*").eq("id", template.id).single();
    expect(updatedTemplate!.next_due_date).toBe("2026-02-28");
    expect(toMoneyString(updatedTemplate!.amount)).toBe("15500");

    const { data: postedTxn } = await client
      .from("transactions")
      .select("*")
      .eq("recurring_template_id", template.id)
      .single();
    expect(toMoneyString(postedTxn!.amount)).toBe("15500");
    expect(postedTxn!.date).toBe("2026-01-31");
  });

  it("a confirmed recurring posting counts as real spend in its own period, same as any expense", async () => {
    const { data: transactions } = await client.from("transactions").select("*");
    const ledgerTransactions: LedgerTransaction[] = transactions!.map((t) => ({
      id: t.id,
      type: t.type,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      amount: toMoneyString(t.amount),
      date: t.date,
      linkedTransactionId: null,
      relatedIouEntryId: t.related_iou_entry_id,
    }));
    const spend = computePeriodSpend(ledgerTransactions, "2026-01-01", "2026-01-31");
    expect(spend.toString()).toBe("15500");
  });

  it("earmarking: a transfer into the spend account starts a cycle, and a due-but-unconfirmed template reduces available-to-spend", async () => {
    await client
      .from("transactions")
      .insert({ user_id: userId, type: "transfer", account_id: bankId, to_account_id: spendId, amount: 20000, date: "2026-03-01" });
    const newTemplate = await insertOne(
      client
        .from("recurring_templates")
        .insert({
        user_id: userId,
        kind: "expense",
        category_id: categoryId,
        account_id: bankId,
        amount: 5000,
        frequency: "monthly",
        next_due_date: "2026-03-02",
        })
        .select()
        .single(),
      "recurring_templates",
    );

    const { data: transactions } = await client.from("transactions").select("*");
    const ledgerTransactions: LedgerTransaction[] = transactions!.map((t) => ({
      id: t.id,
      type: t.type,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      amount: toMoneyString(t.amount),
      date: t.date,
      linkedTransactionId: null,
      relatedIouEntryId: t.related_iou_entry_id,
    }));

    const cycleStart = findCurrentCycleStart(ledgerTransactions, spendId);
    expect(cycleStart).toBe("2026-03-01");

    const { data: dueTemplates } = await client
      .from("recurring_templates")
      .select("*")
      .eq("active", true)
      .lte("next_due_date", "2026-03-02");
    // Includes both this test's new template AND the earlier test's rent
    // template (now advanced to 2026-02-28, still active, still <= 03-02) —
    // state is shared across `it` blocks in this describe, deliberately not
    // isolated per-test since each builds on a realistic ongoing session.
    const upcomingDue = dueTemplates!.reduce((sum, t) => sum + Number(toMoneyString(t.amount)), 0);
    expect(upcomingDue).toBe(15500 + 5000);
    expect(dueTemplates!.map((t) => t.id)).toContain(newTemplate.id);
  });
});
