/**
 * The integration tests' setup blocks insert their fixture rows and then
 * immediately dereference the result (`bank!.id`). When such an insert fails,
 * the PostgREST error is discarded and the suite dies with
 * "Cannot read properties of null (reading 'id')" — which says nothing about
 * what Postgres actually rejected. A real flake seen on 2026-09-05 was
 * undiagnosable for exactly this reason.
 *
 * `insertOne` is the fix: it surfaces the real error. These tests pin that
 * behaviour against real Postgres, using a real constraint violation
 * (account_type is an enum of 'bank' | 'credit_card') rather than a mock.
 *
 * Requires local Supabase running. Not part of the default `npm test` run.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { insertOne } from "./insert";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

describe.runIf(process.env.RUN_RLS_TESTS === "1")("insertOne test helper", () => {
  const admin = createAdminClient<Database>(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId: string;
  let client: ReturnType<typeof createAdminClient<Database>>;

  beforeAll(async () => {
    const email = `insert-helper-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("returns the inserted row on success", async () => {
    const account = await insertOne(
      client.from("accounts").insert({ user_id: userId, name: "HDFC", account_type: "bank" }).select().single(),
      "accounts/HDFC",
    );

    expect(account.id).toBeTruthy();
    expect(account.name).toBe("HDFC");
  });

  it("throws the real Postgres error when the insert is rejected", async () => {
    const rejected = insertOne(
      client
        .from("accounts")
        // 'savings' is not in the account_type enum — Postgres rejects this with 22P02.
        .insert({ user_id: userId, name: "Bad", account_type: "savings" as never })
        .select()
        .single(),
      "accounts/Bad",
    );

    await expect(rejected).rejects.toThrow(/invalid input value for enum account_type/);
  });

  it("names the row it was inserting, so a failure points at the right setup line", async () => {
    const rejected = insertOne(
      client
        .from("accounts")
        .insert({ user_id: userId, name: "Bad", account_type: "savings" as never })
        .select()
        .single(),
      "accounts/Bad",
    );

    await expect(rejected).rejects.toThrow(/accounts\/Bad/);
  });
});
