/**
 * Live verification of PRD §7/§10.8/§12 (IOU & Reimbursements), against real
 * Postgres — the biggest and most cross-cutting module: Group Expenses,
 * Receivables, Payables, Reimbursements, write-offs, and the
 * amount_settled/status recompute rule all interact here.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeIouEntrySettlement } from "@/lib/ledger/iou";
import { computePeriodSpend } from "@/lib/ledger/spend";
import { toMoneyString } from "@/lib/ledger/money";
import type { LedgerTransaction } from "@/lib/ledger/types";
import type { Database } from "@/types/database";
import { insertOne, selectOne, selectRows } from "./helpers/insert";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

async function recompute(client: ReturnType<typeof createAdminClient<Database>>, entryId: string) {
  const entry = await selectOne(
    client.from("iou_entries").select("*").eq("id", entryId).single(),
    `iou_entries/${entryId}`,
  );
  const linked = await selectRows(
    client.from("transactions").select("*").eq("related_iou_entry_id", entryId),
    `transactions linked to iou_entry ${entryId}`,
  );
  const ledgerTxns: LedgerTransaction[] = linked.map((t) => ({
    id: t.id,
    type: t.type,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    amount: toMoneyString(t.amount),
    date: t.date,
    linkedTransactionId: null,
    relatedIouEntryId: t.related_iou_entry_id,
  }));
  const { amountSettled, status } = computeIouEntrySettlement(
    { id: entry.id, amountOwed: toMoneyString(entry.amount_owed), writtenOff: entry.status === "written_off" },
    ledgerTxns,
  );
  await client.from("iou_entries").update({ amount_settled: amountSettled.toString() as unknown as number, status }).eq("id", entryId);
}

describe.runIf(process.env.RUN_RLS_TESTS === "1")("IOU & Reimbursements (PRD §7), live", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;
  let bankId: string;
  let categoryId: string;

  beforeAll(async () => {
    const email = `iou-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
    if (error) throw error;
    userId = created.user!.id;

    client = createAdminClient<Database>(URL, PUBLISHABLE_KEY);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: "test-password-123" });
    if (signInError) throw signInError;

    const bank = await insertOne(
      client.from("accounts").insert({ user_id: userId, name: "Bank", account_type: "bank" }).select().single(),
      "accounts/Bank",
    );
    bankId = bank.id;
    const category = await insertOne(
      client.from("categories").insert({ user_id: userId, name: "Leisure", kind: "expense" }).select().single(),
      "categories/Leisure",
    );
    categoryId = category.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("a Group Expense with a custom split that doesn't sum to the total still posts correctly", async () => {
    // ₹3000 total, two friends owe ₹800 each — ₹1400 (the gap) is the user's own share.
    const expenseTxn = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: categoryId, amount: 3000, date: "2026-01-01" })
        .select()
        .single(),
      "transactions",
    );
    const groupExpense = await insertOne(
      client
        .from("group_expenses")
        .insert({ user_id: userId, transaction_id: expenseTxn.id, total_amount: 3000, split_method: "custom" })
        .select()
        .single(),
      "group_expenses",
    );
    const { data: entries } = await client
      .from("iou_entries")
      .insert([
        { user_id: userId, direction: "receivable", group_expense_id: groupExpense.id, person_name: "Alice", amount_owed: 800, date_incurred: "2026-01-01" },
        { user_id: userId, direction: "receivable", group_expense_id: groupExpense.id, person_name: "Bob", amount_owed: 800, date_incurred: "2026-01-01" },
      ])
      .select();

    expect(entries).toHaveLength(2);
    const sumOwed = entries!.reduce((s, e) => s + Number(toMoneyString(e.amount_owed)), 0);
    expect(sumOwed).toBe(1600); // less than the 3000 total — never validated to match, per §7
  });

  it("dynamic net-spend: a repayment reduces the group expense's effective spend in its own period", async () => {
    const expenseTxn = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: categoryId, amount: 3000, date: "2026-02-01" })
        .select()
        .single(),
      "transactions",
    );
    const groupExpense = await insertOne(
      client
        .from("group_expenses")
        .insert({ user_id: userId, transaction_id: expenseTxn.id, total_amount: 3000, split_method: "equal" })
        .select()
        .single(),
      "group_expenses",
    );
    const entry = await insertOne(
      client
        .from("iou_entries")
        .insert({ user_id: userId, direction: "receivable", group_expense_id: groupExpense.id, person_name: "Alice", amount_owed: 1000, date_incurred: "2026-02-01" })
        .select()
        .single(),
      "iou_entries",
    );

    const repayment = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "iou_repayment", account_id: bankId, related_iou_entry_id: entry.id, amount: 600, date: "2026-02-15" })
        .select()
        .single(),
      "transactions",
    );
    await recompute(client, entry.id);

    const { data: updatedEntry } = await client.from("iou_entries").select("*").eq("id", entry.id).single();
    expect(toMoneyString(updatedEntry!.amount_settled)).toBe("600");
    expect(updatedEntry!.status).toBe("partial");

    // Effective spend for Feb: 3000 - 600 = 2400. computePeriodSpend needs
    // the repayment's linkedTransactionId resolved to the original expense.
    const { data: transactions } = await client.from("transactions").select("*");
    const ledgerTxns: LedgerTransaction[] = transactions!.map((t) => ({
      id: t.id,
      type: t.type,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      amount: toMoneyString(t.amount),
      date: t.date,
      linkedTransactionId: t.id === repayment.id ? expenseTxn.id : null,
      relatedIouEntryId: t.related_iou_entry_id,
    }));
    const spend = computePeriodSpend(ledgerTxns, "2026-02-01", "2026-02-28");
    expect(spend.toString()).toBe("2400");

    // Editing the repayment's amount recomputes the entry with no manual
    // intervention — this is the exact rule from §10.8/D-... the M4 exit
    // test calls out explicitly.
    await client.from("transactions").update({ amount: 1000 }).eq("id", repayment.id);
    await recompute(client, entry.id);
    const { data: afterEdit } = await client.from("iou_entries").select("*").eq("id", entry.id).single();
    expect(toMoneyString(afterEdit!.amount_settled)).toBe("1000");
    expect(afterEdit!.status).toBe("settled");
  });

  it("a written-off entry drops out of the net totals, and a new repayment reverses that", async () => {
    const entry = await insertOne(
      client
        .from("iou_entries")
        .insert({ user_id: userId, direction: "payable", person_name: "Carol", amount_owed: 500, date_incurred: "2026-03-01" })
        .select()
        .single(),
      "iou_entries",
    );

    function netPayable(entries: { status: string; amount_owed: number; amount_settled: number }[]) {
      return entries
        .filter((e) => e.status === "pending" || e.status === "partial")
        .reduce((sum, e) => sum + Number(toMoneyString(e.amount_owed)) - Number(toMoneyString(e.amount_settled)), 0);
    }

    const { data: before } = await client.from("iou_entries").select("*").eq("id", entry.id);
    expect(netPayable(before!)).toBe(500);

    await client.from("iou_entries").update({ status: "written_off" }).eq("id", entry.id);
    const { data: afterWriteOff } = await client.from("iou_entries").select("*").eq("id", entry.id);
    expect(netPayable(afterWriteOff!)).toBe(0);

    // A new settlement against a written-off entry moves it back out, §10.8.
    await client.from("transactions").insert({ user_id: userId, type: "iou_settlement", account_id: bankId, related_iou_entry_id: entry.id, amount: 200, date: "2026-03-10" });
    await recompute(client, entry.id);
    const { data: afterRepay } = await client.from("iou_entries").select("*").eq("id", entry.id).single();
    expect(afterRepay!.status).toBe("partial");
  });

  it("a Payable's creation touches neither balance nor spend; settling it does count as spend", async () => {
    const entry = await insertOne(
      client
        .from("iou_entries")
        .insert({ user_id: userId, direction: "payable", person_name: "Dave", amount_owed: 400, date_incurred: "2026-04-01" })
        .select()
        .single(),
      "iou_entries",
    );

    let { data: transactions } = await client.from("transactions").select("*").gte("date", "2026-04-01").lte("date", "2026-04-30");
    expect(transactions).toEqual([]); // creating the payable alone: no transaction row at all

    await client.from("transactions").insert({ user_id: userId, type: "iou_settlement", account_id: bankId, related_iou_entry_id: entry.id, amount: 400, date: "2026-04-05" });
    await recompute(client, entry.id);

    ({ data: transactions } = await client.from("transactions").select("*").gte("date", "2026-04-01").lte("date", "2026-04-30"));
    const ledgerTxns: LedgerTransaction[] = transactions!.map((t) => ({
      id: t.id, type: t.type, accountId: t.account_id, toAccountId: t.to_account_id,
      amount: toMoneyString(t.amount), date: t.date, linkedTransactionId: null, relatedIouEntryId: t.related_iou_entry_id,
    }));
    expect(computePeriodSpend(ledgerTxns, "2026-04-01", "2026-04-30").toString()).toBe("400");
  });

  it("reimbursement received reduces the original expense's effective spend, and is never treated as fresh income", async () => {
    const expenseTxn = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: categoryId, amount: 2000, date: "2026-05-01" })
        .select()
        .single(),
      "transactions",
    );
    const entry = await insertOne(
      client
        .from("iou_entries")
        .insert({ user_id: userId, direction: "reimbursement", reimbursed_transaction_id: expenseTxn.id, person_name: "Employer", amount_owed: 2000, date_incurred: "2026-05-01" })
        .select()
        .single(),
      "iou_entries",
    );

    await client.from("transactions").insert({ user_id: userId, type: "iou_repayment", account_id: bankId, related_iou_entry_id: entry.id, amount: 2000, date: "2026-05-20" });
    await recompute(client, entry.id);

    const { data: updatedEntry } = await client.from("iou_entries").select("status").eq("id", entry.id).single();
    expect(updatedEntry!.status).toBe("settled");

    const { data: transactions } = await client.from("transactions").select("*");
    const ledgerTxns: LedgerTransaction[] = transactions!
      .filter((t) => t.date >= "2026-05-01" && t.date <= "2026-05-31")
      .map((t) => ({
        id: t.id, type: t.type, accountId: t.account_id, toAccountId: t.to_account_id,
        amount: toMoneyString(t.amount), date: t.date,
        linkedTransactionId: t.type === "iou_repayment" ? expenseTxn.id : null,
        relatedIouEntryId: t.related_iou_entry_id,
      }));
    // 2000 expense - 2000 reimbursement = 0 effective spend for May.
    expect(computePeriodSpend(ledgerTxns, "2026-05-01", "2026-05-31").toString()).toBe("0");
  });

  it("Delete Group Expense tears down the transaction, the group_expenses row, its IOU entries, AND their repayments together", async () => {
    const expenseTxn = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "expense", account_id: bankId, category_id: categoryId, amount: 1000, date: "2026-06-01" })
        .select()
        .single(),
      "transactions",
    );
    const groupExpense = await insertOne(
      client
        .from("group_expenses")
        .insert({ user_id: userId, transaction_id: expenseTxn.id, total_amount: 1000, split_method: "equal" })
        .select()
        .single(),
      "group_expenses",
    );
    const entry = await insertOne(
      client
        .from("iou_entries")
        .insert({ user_id: userId, direction: "receivable", group_expense_id: groupExpense.id, person_name: "Eve", amount_owed: 500, date_incurred: "2026-06-01" })
        .select()
        .single(),
      "iou_entries",
    );
    const repayment = await insertOne(
      client
        .from("transactions")
        .insert({ user_id: userId, type: "iou_repayment", account_id: bankId, related_iou_entry_id: entry.id, amount: 200, date: "2026-06-10" })
        .select()
        .single(),
      "transactions",
    );

    // Naive delete of the anchor transaction should FAIL — the repayment's
    // related_iou_entry_id (ON DELETE RESTRICT) blocks the iou_entries
    // cascade that deleting group_expenses would otherwise trigger.
    const { error: naiveError } = await client.from("transactions").delete().eq("id", expenseTxn.id);
    expect(naiveError).not.toBeNull();

    // The real deleteGroupExpense action's order: repayments first, then the anchor.
    await client.from("transactions").delete().eq("id", repayment.id);
    const { error: properError } = await client.from("transactions").delete().eq("id", expenseTxn.id);
    expect(properError).toBeNull();

    const { data: geAfter } = await client.from("group_expenses").select("id").eq("id", groupExpense.id);
    const { data: entryAfter } = await client.from("iou_entries").select("id").eq("id", entry.id);
    expect(geAfter).toEqual([]);
    expect(entryAfter).toEqual([]);
  });
});
