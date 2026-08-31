/**
 * Live verification of PRD §6/§10.5/§10.7 (Investments & Savings), against
 * real Postgres — including the SIP-via-recurring-template path, which
 * needed a schema extension (docs/DECISIONS.md D-9) beyond the original
 * PRD §11 table.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computePeriodSpend } from "@/lib/ledger/spend";
import { computeRawSavingsTracked } from "@/lib/ledger/savings";
import { computeNextDueDate } from "@/lib/ledger/recurring";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Investments & Savings (PRD §6), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let savingsId: string;
  let savings2Id: string;

  beforeAll(async () => {
    const email = `investments-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: "test-password-123",
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user!.id;

    client = createAdminClient<Database>(URL, PUBLISHABLE_KEY);
    await client.auth.signInWithPassword({ email, password: "test-password-123" });

    const { data: bank } = await client
      .from("accounts")
      .insert({ user_id: userId, name: "Bank", account_type: "bank" })
      .select()
      .single();
    bankId = bank!.id;

    const { data: savings } = await client
      .from("accounts")
      .insert({ user_id: userId, name: "Slice", account_type: "bank", is_savings: true })
      .select()
      .single();
    savingsId = savings!.id;

    const { data: savings2 } = await client
      .from("accounts")
      .insert({ user_id: userId, name: "Other Savings", account_type: "bank", is_savings: true })
      .select()
      .single();
    savings2Id = savings2!.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("an investment contribution debits the account but never counts as spend", async () => {
    const { data: instrument } = await client
      .from("instruments")
      .insert({ user_id: userId, vehicle_type: "mutual_fund", name: "Test Fund", symbol: "TESTF" })
      .select()
      .single();

    await client.from("transactions").insert({
      user_id: userId,
      type: "investment",
      account_id: bankId,
      instrument_id: instrument!.id,
      amount: 5000,
      quantity: 12.5,
      date: "2026-01-10",
    });

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
    expect(spend.toString()).toBe("0");

    const { data: holdings } = await client.from("transactions").select("amount, quantity").eq("instrument_id", instrument!.id);
    const totalInvested = holdings!.reduce((sum, h) => sum + Number(toMoneyString(h.amount)), 0);
    expect(totalInvested).toBe(5000);
  });

  it("a savings-to-savings transfer is excluded from raw savings tracked, but a real deposit counts", async () => {
    await client.from("transactions").insert({ user_id: userId, type: "transfer", account_id: bankId, to_account_id: savingsId, amount: 10000, date: "2026-02-01" });
    await client.from("transactions").insert({ user_id: userId, type: "transfer", account_id: savingsId, to_account_id: savings2Id, amount: 3000, date: "2026-02-05" });

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

    const rawSavings = computeRawSavingsTracked(ledgerTransactions, new Set([savingsId, savings2Id]), "2026-02-01", "2026-02-28");
    // 10,000 real deposit counts; the 3,000 relocation between two savings
    // accounts does not (its source is itself a savings account).
    expect(rawSavings.toString()).toBe("10000");
  });

  it("a SIP recurring template posts an investment transaction with instrument_id and quantity set", async () => {
    const { data: instrument } = await client
      .from("instruments")
      .insert({ user_id: userId, vehicle_type: "equity", name: "Test Stock", symbol: "TST", exchange: "NSE" })
      .select()
      .single();

    const { data: template } = await client
      .from("recurring_templates")
      .insert({
        user_id: userId,
        kind: "investment",
        instrument_id: instrument!.id,
        account_id: bankId,
        amount: 2000,
        quantity: 4,
        frequency: "monthly",
        next_due_date: "2026-03-01",
      })
      .select()
      .single();

    // Same logic confirmRecurringPosting performs (see recurring.integration.test.ts's note).
    await client.from("transactions").insert({
      user_id: userId,
      type: template!.kind,
      account_id: template!.account_id,
      instrument_id: template!.instrument_id,
      quantity: template!.quantity,
      amount: template!.amount,
      date: template!.next_due_date,
      recurring_template_id: template!.id,
    });
    const nextDueDate = computeNextDueDate(template!.next_due_date, template!.frequency, template!.custom_interval_days ?? undefined);
    await client.from("recurring_templates").update({ next_due_date: nextDueDate }).eq("id", template!.id);

    const { data: posted } = await client
      .from("transactions")
      .select("*")
      .eq("recurring_template_id", template!.id)
      .single();
    expect(posted!.instrument_id).toBe(instrument!.id);
    expect(toMoneyString(posted!.quantity!)).toBe("4");
    expect(posted!.category_id).toBeNull();
  });
});
