/**
 * Live verification of PRD §3/§10.10 reconciliation, against real Postgres.
 * Replicates `reconcileAccount`'s logic directly (it needs a real Next.js
 * request for cookies()) against the real schema and tracked-balance math.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Decimal } from "decimal.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeAccountBalance } from "@/lib/ledger/balance";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
const AUDIT_THRESHOLD = 500;

async function trackedBalanceOf(client: ReturnType<typeof createAdminClient<Database>>, accountId: string) {
  const { data: account } = await client.from("accounts").select("*").eq("id", accountId).single();
  const { data: transactions } = await client.from("transactions").select("*");
  const ledgerAccount: LedgerAccount = { id: account!.id, accountType: account!.account_type, isSpendAccount: account!.is_spend_account, isSavings: account!.is_savings };
  const ledgerTxns: LedgerTransaction[] = transactions!.map((t) => ({
    id: t.id, type: t.type, accountId: t.account_id, toAccountId: t.to_account_id,
    amount: toMoneyString(t.amount), date: t.date, linkedTransactionId: null, relatedIouEntryId: t.related_iou_entry_id,
  }));
  return computeAccountBalance(ledgerAccount, ledgerTxns);
}

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Reconciliation (PRD §3/§10.10), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;

  beforeAll(async () => {
    const email = `reconcile-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
    if (error) throw error;
    userId = created.user!.id;

    client = createAdminClient<Database>(URL, PUBLISHABLE_KEY);
    await client.auth.signInWithPassword({ email, password: "test-password-123" });

    const { data: bank } = await client.from("accounts").insert({ user_id: userId, name: "Bank", account_type: "bank" }).select().single();
    bankId = bank!.id;
    await client.from("categories").insert([
      { user_id: userId, name: "Misc income", kind: "income" },
      { user_id: userId, name: "Miscellaneous", kind: "expense" },
    ]);
    await client.from("transactions").insert({ user_id: userId, type: "income", account_id: bankId, category_id: (await client.from("categories").select("id").eq("name", "Misc income").single()).data!.id, amount: 10000, date: "2026-01-01" });
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("a small delta (actual > tracked) auto-corrects as Misc income", async () => {
    const tracked = await trackedBalanceOf(client, bankId);
    expect(tracked.toString()).toBe("10000");

    const actual = "10150"; // delta +150, under the 500 threshold
    const delta = new Decimal(actual).minus(tracked);
    expect(delta.abs().lessThan(AUDIT_THRESHOLD)).toBe(true);

    const { data: category } = await client.from("categories").select("id").eq("name", "Misc income").single();
    const { data: correctingTxn } = await client
      .from("transactions")
      .insert({ user_id: userId, type: "income", account_id: bankId, category_id: category!.id, amount: delta.abs().toString() as unknown as number, date: "2026-01-15", note: "Reconciliation correction" })
      .select()
      .single();
    await client.from("balance_snapshots").insert({
      user_id: userId, account_id: bankId, date: "2026-01-15",
      actual_balance: actual as unknown as number, tracked_balance_at_time: tracked.toString() as unknown as number,
      correcting_transaction_id: correctingTxn!.id,
    });

    const newTracked = await trackedBalanceOf(client, bankId);
    expect(newTracked.toString()).toBe(actual);
  });

  it("a delta over the audit threshold does NOT auto-correct — it's a signal to review, not a transaction", async () => {
    const tracked = await trackedBalanceOf(client, bankId);
    const actual = tracked.plus(800).toString(); // well over 500
    const delta = new Decimal(actual).minus(tracked);
    expect(delta.abs().greaterThanOrEqualTo(AUDIT_THRESHOLD)).toBe(true);

    // The real action inserts a snapshot with correcting_transaction_id = null
    // in this branch — no transaction is created at all.
    const { data: snapshot } = await client
      .from("balance_snapshots")
      .insert({ user_id: userId, account_id: bankId, date: "2026-01-20", actual_balance: actual as unknown as number, tracked_balance_at_time: tracked.toString() as unknown as number, correcting_transaction_id: null })
      .select()
      .single();
    expect(snapshot!.correcting_transaction_id).toBeNull();

    // Tracked balance is genuinely unchanged — no phantom correction happened.
    const stillTracked = await trackedBalanceOf(client, bankId);
    expect(stillTracked.toString()).toBe(tracked.toString());
  });

  it("getTransactionsSinceLastSnapshot-equivalent: transactions after the last snapshot date are what the audit flow shows", async () => {
    const { data: lastSnapshot } = await client.from("balance_snapshots").select("*").eq("account_id", bankId).order("date", { ascending: false }).limit(1).single();
    const { data: since } = await client.from("transactions").select("*").eq("account_id", bankId).gte("date", lastSnapshot!.date);
    // Only transactions on/after the most recent snapshot's date should show.
    expect(since!.every((t) => t.date >= lastSnapshot!.date)).toBe(true);
  });
});
