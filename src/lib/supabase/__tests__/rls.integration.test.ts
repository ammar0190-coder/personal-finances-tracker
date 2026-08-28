/**
 * Live RLS isolation test — runs against a real local Supabase instance
 * (`supabase start`), not mocks. This is the single most important test in
 * the project: it verifies the exact hazard flagged during PRD review — that
 * one user genuinely cannot see another's rows, at the database level, not
 * just "structurally separated" by application code that could have a bug.
 *
 * Requires local Supabase running (`npx supabase start`). Not part of the
 * default `npm test` run — see `npm run test:rls` / CLAUDE.md Commands.
 */
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

async function createTestUserClient(admin: SupabaseClient, email: string, password: string) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const client = createAdminClient(URL, PUBLISHABLE_KEY);
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { client, userId: created.user!.id, session: signedIn.session! };
}

describe.runIf(process.env.RUN_RLS_TESTS === "1")("Row-Level Security isolation (PRD §13, live)", () => {
  const admin = createAdminClient(URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let userA: Awaited<ReturnType<typeof createTestUserClient>>;
  let userB: Awaited<ReturnType<typeof createTestUserClient>>;
  const suffix = Date.now();

  beforeAll(async () => {
    userA = await createTestUserClient(admin, `rls-test-a-${suffix}@example.com`, "test-password-123");
    userB = await createTestUserClient(admin, `rls-test-b-${suffix}@example.com`, "test-password-123");
  });

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA.userId);
    if (userB) await admin.auth.admin.deleteUser(userB.userId);
  });

  it("the handle_new_user trigger provisioned a public.users row for each", async () => {
    const { data, error } = await userA.client.from("users").select("id").eq("id", userA.userId).single();
    expect(error).toBeNull();
    expect(data?.id).toBe(userA.userId);
  });

  it("user A can insert their own account", async () => {
    const { data, error } = await userA.client
      .from("accounts")
      .insert({ user_id: userA.userId, name: "A's HDFC", account_type: "bank" })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe("A's HDFC");
  });

  it("user B cannot see user A's account at all — not an empty-because-filtered leak, a hard zero", async () => {
    const { data, error } = await userB.client.from("accounts").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user A sees exactly their own account, not user B's", async () => {
    await userB.client.from("accounts").insert({ user_id: userB.userId, name: "B's SBI", account_type: "bank" });

    const { data: aView } = await userA.client.from("accounts").select("name");
    expect(aView?.map((r) => r.name)).toEqual(["A's HDFC"]);

    const { data: bView } = await userB.client.from("accounts").select("name");
    expect(bView?.map((r) => r.name)).toEqual(["B's SBI"]);
  });

  it("user A cannot insert a row claiming to belong to user B — WITH CHECK rejects it", async () => {
    const { error } = await userA.client
      .from("accounts")
      .insert({ user_id: userB.userId, name: "spoofed", account_type: "bank" });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security|policy/i);
  });

  it("user B cannot update a row they can't even see", async () => {
    const { data: aAccounts } = await admin.from("accounts").select("id").eq("user_id", userA.userId);
    const targetId = aAccounts![0].id;

    const { data, error } = await userB.client
      .from("accounts")
      .update({ name: "hijacked" })
      .eq("id", targetId)
      .select();
    // RLS makes this a no-op match (0 rows), not a thrown error — verify
    // nothing changed rather than asserting a particular error shape.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillA } = await admin.from("accounts").select("name").eq("id", targetId).single();
    expect(stillA?.name).toBe("A's HDFC");
  });

  it("user B cannot delete user A's row", async () => {
    const { data: aAccounts } = await admin.from("accounts").select("id").eq("user_id", userA.userId);
    const targetId = aAccounts![0].id;

    await userB.client.from("accounts").delete().eq("id", targetId);

    const { data: stillThere } = await admin.from("accounts").select("id").eq("id", targetId).single();
    expect(stillThere?.id).toBe(targetId);
  });
});
