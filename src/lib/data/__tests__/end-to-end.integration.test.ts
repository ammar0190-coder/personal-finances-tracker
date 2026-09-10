/**
 * End-to-end smoke test against a REAL local Supabase instance: a realistic
 * session's worth of accounts, categories, and transactions, inserted
 * exactly the way the Server Actions in src/lib/actions do it, then read
 * back through the same computeAccountBalance the Dashboard uses. This is
 * the seam a pure unit test can't cover — real Postgres, real RLS, real
 * numeric->JSON round-trip, all at once.
 *
 * Requires local Supabase running. Not part of the default `npm test` run.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeAccountBalance } from "@/lib/ledger/balance";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";
import { insertOne } from "./helpers/insert";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

describe.runIf(process.env.RUN_RLS_TESTS === "1")("End-to-end: real accounts, categories, transactions", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let cardId: string;
  let foodCategoryId: string;
  let salaryCategoryId: string;

  beforeAll(async () => {
    const email = `e2e-${Date.now()}@example.com`;
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
        .insert({ user_id: userId, name: "HDFC", account_type: "bank", is_spend_account: true })
        .select()
        .single(),
      "accounts/HDFC",
    );
    bankId = bank.id;

    const card = await insertOne(
      client
        .from("accounts")
        .insert({ user_id: userId, name: "Credit Card", account_type: "credit_card" })
        .select()
        .single(),
      "accounts/Credit Card",
    );
    cardId = card.id;

    const food = await insertOne(
      client
        .from("categories")
        .insert({ user_id: userId, name: "Food", kind: "expense" })
        .select()
        .single(),
      "categories/Food",
    );
    foodCategoryId = food.id;

    const salary = await insertOne(
      client
        .from("categories")
        .insert({ user_id: userId, name: "Salary", kind: "income" })
        .select()
        .single(),
      "categories/Salary",
    );
    salaryCategoryId = salary.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("a realistic month of transactions produces the exact balance PRD §10.1 predicts", async () => {
    // Salary lands in the bank.
    await client
      .from("transactions")
      .insert({ user_id: userId, type: "income", account_id: bankId, category_id: salaryCategoryId, amount: 75000, date: "2026-01-01" });

    // Two food expenses, one from the bank, one on the card.
    await client
      .from("transactions")
      .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: foodCategoryId, amount: 450.5, date: "2026-01-05" });
    await client
      .from("transactions")
      .insert({ user_id: userId, type: "expense", account_id: cardId, category_id: foodCategoryId, amount: 1200, date: "2026-01-10" });

    // Paying the card bill: a transfer from bank to card.
    await client
      .from("transactions")
      .insert({ user_id: userId, type: "transfer", account_id: bankId, to_account_id: cardId, amount: 1200, date: "2026-01-15" });

    const { data: accounts } = await client.from("accounts").select("*").order("created_at");
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

    const bankAccount: LedgerAccount = {
      id: bankId,
      accountType: "bank",
      isSpendAccount: true,
      isSavings: false,
    };
    const cardAccount: LedgerAccount = { id: cardId, accountType: "credit_card", isSpendAccount: false, isSavings: false };

    const bankBalance = computeAccountBalance(bankAccount, ledgerTransactions);
    const cardBalance = computeAccountBalance(cardAccount, ledgerTransactions);

    // Bank: +75000 income -450.50 food -1200 transfer-to-card = 73349.50
    expect(bankBalance.toString()).toBe("73349.5");
    // Card: +1200 expense -1200 transfer-in (bill payment) = 0 owed
    expect(cardBalance.toString()).toBe("0");

    expect(accounts).toHaveLength(2);
  });
});
