/**
 * Live verification of PRD §9 Reports, against real Postgres — specifically
 * the M6 exit test: a past period's effective spend keeps shrinking after a
 * refund lands against it, dated after the fact (§10.3).
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeSpendByCategory } from "@/lib/ledger/category-spend";
import { toMoneyString } from "@/lib/ledger/money";
import type { Database } from "@/types/database";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Reports (PRD §9), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let categoryId: string;

  beforeAll(async () => {
    const email = `reports-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
    if (error) throw error;
    userId = created.user!.id;

    client = createAdminClient<Database>(URL, PUBLISHABLE_KEY);
    await client.auth.signInWithPassword({ email, password: "test-password-123" });

    const { data: bank } = await client.from("accounts").insert({ user_id: userId, name: "Bank", account_type: "bank" }).select().single();
    bankId = bank!.id;
    const { data: category } = await client.from("categories").insert({ user_id: userId, name: "Shopping", kind: "expense" }).select().single();
    categoryId = category!.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("a January category total shrinks after a February refund lands against a January expense", async () => {
    const { data: original } = await client
      .from("transactions")
      .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: categoryId, amount: 2000, date: "2026-01-15" })
      .select()
      .single();

    async function januaryShoppingTotal() {
      const { data: transactions } = await client.from("transactions").select("*");
      const categorized = transactions!.map((t) => ({
        id: t.id, type: t.type, accountId: t.account_id, toAccountId: t.to_account_id,
        amount: toMoneyString(t.amount), date: t.date,
        linkedTransactionId: t.type === "refund" ? t.refunded_transaction_id : null,
        relatedIouEntryId: t.related_iou_entry_id,
        categoryId: t.category_id,
      }));
      const totals = computeSpendByCategory(categorized, "2026-01-01", "2026-01-31");
      return totals.get(categoryId)?.toString() ?? "0";
    }

    expect(await januaryShoppingTotal()).toBe("2000");

    // A refund lands in February, dated after the fact, against the January expense.
    await client.from("transactions").insert({
      user_id: userId, type: "refund", account_id: bankId, amount: 500, date: "2026-02-03", refunded_transaction_id: original!.id,
    });

    // January's own report, viewed now, shows the shrunken figure.
    expect(await januaryShoppingTotal()).toBe("1500");
  });
});
