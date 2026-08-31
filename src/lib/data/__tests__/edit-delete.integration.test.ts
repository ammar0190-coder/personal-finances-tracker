/**
 * Live verification of PRD §12's Edit/Delete transaction rules — the most
 * requested fix from the original PRD review — against real Postgres.
 *
 * The Server Actions in src/lib/actions/transactions.ts can't be called
 * directly here (they use next/headers' cookies(), which only works inside
 * a real Next.js request). What's tested instead is the same thing those
 * actions ultimately rely on: that editing/deleting actually recomputes
 * balances correctly with no stale state, and that the database's own FK
 * constraints back up the app-level delete-blocking rule rather than
 * silently allowing (or silently cascading) something the PRD says should
 * be blocked.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeAccountBalance } from "@/lib/ledger/balance";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

async function balanceOf(client: ReturnType<typeof createAdminClient<Database>>, accountId: string) {
  const { data: account } = await client.from("accounts").select("*").eq("id", accountId).single();
  const { data: transactions } = await client.from("transactions").select("*");
  const ledgerAccount: LedgerAccount = {
    id: account!.id,
    accountType: account!.account_type,
    isSpendAccount: account!.is_spend_account,
    isSavings: account!.is_savings,
  };
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
  return computeAccountBalance(ledgerAccount, ledgerTransactions);
}

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Edit/Delete transaction (PRD §12), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let categoryId: string;

  beforeAll(async () => {
    const email = `editdelete-${Date.now()}@example.com`;
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

    const { data: category } = await client
      .from("categories")
      .insert({ user_id: userId, name: "Food", kind: "expense" })
      .select()
      .single();
    categoryId = category!.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("editing a transaction's amount changes the balance with no stale state", async () => {
    const { data: txn } = await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, category_id: categoryId, type: "expense", amount: 100, date: "2026-01-01" })
      .select()
      .single();

    expect((await balanceOf(client, bankId)).toString()).toBe("-100");

    await client.from("transactions").update({ amount: 250 }).eq("id", txn!.id);

    expect((await balanceOf(client, bankId)).toString()).toBe("-250");

    await client.from("transactions").delete().eq("id", txn!.id);
  });

  it("deleting a transaction removes its effect on the balance entirely", async () => {
    const { data: keep } = await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, category_id: categoryId, type: "income", amount: 1000, date: "2026-01-01" })
      .select()
      .single();
    const { data: toDelete } = await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, category_id: categoryId, type: "expense", amount: 300, date: "2026-01-02" })
      .select()
      .single();

    expect((await balanceOf(client, bankId)).toString()).toBe("700");

    await client.from("transactions").delete().eq("id", toDelete!.id);

    expect((await balanceOf(client, bankId)).toString()).toBe("1000");

    await client.from("transactions").delete().eq("id", keep!.id);
  });

  it("the database itself blocks deleting a transaction a refund is linked to (FK backstop for §12's rule)", async () => {
    const { data: original } = await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, category_id: categoryId, type: "expense", amount: 500, date: "2026-01-01" })
      .select()
      .single();
    await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, type: "refund", amount: 100, date: "2026-01-05", refunded_transaction_id: original!.id });

    const { error } = await client.from("transactions").delete().eq("id", original!.id);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toMatch(/violat|foreign key|constraint/);

    // Cleanup respects the same constraint — delete the refund first.
    await client.from("transactions").delete().eq("refunded_transaction_id", original!.id);
    await client.from("transactions").delete().eq("id", original!.id);
  });

  it("deleting a Group Expense's anchor transaction cascades to its Group_Expenses row and IOU entries together", async () => {
    const { data: expenseTxn } = await client
      .from("transactions")
      .insert({ user_id: userId, account_id: bankId, category_id: categoryId, type: "expense", amount: 3000, date: "2026-01-01" })
      .select()
      .single();
    const { data: groupExpense } = await client
      .from("group_expenses")
      .insert({ user_id: userId, transaction_id: expenseTxn!.id, total_amount: 3000, split_method: "equal" })
      .select()
      .single();
    const { data: iouEntry } = await client
      .from("iou_entries")
      .insert({
        user_id: userId,
        direction: "receivable",
        group_expense_id: groupExpense!.id,
        person_name: "Friend",
        amount_owed: 1000,
        date_incurred: "2026-01-01",
      })
      .select()
      .single();

    await client.from("transactions").delete().eq("id", expenseTxn!.id);

    const { data: groupExpenseAfter } = await client.from("group_expenses").select("id").eq("id", groupExpense!.id);
    const { data: iouEntryAfter } = await client.from("iou_entries").select("id").eq("id", iouEntry!.id);
    expect(groupExpenseAfter).toEqual([]);
    expect(iouEntryAfter).toEqual([]);
  });
});
