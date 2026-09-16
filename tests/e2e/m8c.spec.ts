/**
 * M8c, in a real browser: Account Settings, the theme toggle, and the
 * Dashboard date-range control.
 *
 * The date-range tests are the point of this file. The audit
 * (docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md, D-16)
 * approved the picker on one condition — it scopes spend-so-far and nothing
 * else — and the failure mode it guards against is not a crash. It is a
 * Dashboard that keeps working while quietly showing an account balance "as
 * of" a window, or an IOU position mixing a historical amount_owed with
 * today's amount_settled. Those numbers look completely plausible, which is
 * why they are asserted here against a real page rather than trusted.
 *
 * Data is seeded through the admin client rather than the UI: these tests are
 * about what the Dashboard does with a range, not about logging.
 */
import type { Page } from "@playwright/test";
import { adminClient } from "./support/local-supabase";
import { expect, expectAppPage, form, region, test } from "./support/fixtures";

const TODAY = new Date().toISOString().slice(0, 10);
/** Old enough that no plausible current cycle contains it. */
const LONG_AGO_START = "2024-02-01";
const LONG_AGO_END = "2024-02-29";

async function seedLedger(userId: string) {
  const admin = adminClient();

  const { data: account, error } = await admin
    .from("accounts")
    .insert({ user_id: userId, name: "HDFC", account_type: "bank", is_spend_account: true })
    .select()
    .single();
  if (error) throw error;

  // The schema requires a category on both expense AND income
  // (`category_required_for_expense_income`), so both kinds are seeded.
  const { data: categories, error: categoryError } = await admin
    .from("categories")
    .insert([
      { user_id: userId, name: "Food", kind: "expense" as const },
      { user_id: userId, name: "Salary", kind: "income" as const },
    ])
    .select();
  if (categoryError) throw categoryError;
  const expenseCategory = categories!.find((c) => c.kind === "expense")!.id;
  const incomeCategory = categories!.find((c) => c.kind === "income")!.id;

  const rows = [
    // Inside the old window — invisible to the current cycle.
    { type: "expense" as const, amount: 111, date: LONG_AGO_START, category_id: expenseCategory },
    { type: "income" as const, amount: 2222, date: LONG_AGO_START, category_id: incomeCategory },
    // Today, so they land in the current cycle instead.
    { type: "income" as const, amount: 50000, date: TODAY, category_id: incomeCategory },
    { type: "expense" as const, amount: 450.5, date: TODAY, category_id: expenseCategory },
  ];
  for (const row of rows) {
    const { error: insertError } = await admin.from("transactions").insert({
      user_id: userId,
      account_id: account!.id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      category_id: row.category_id,
    });
    if (insertError) throw insertError;
  }

  return { accountId: account!.id };
}

/**
 * Pick a theme the way a person does — by clicking the label. The radio is
 * `sr-only` and the label sits over it, so Playwright's own `check()` refuses
 * to click the input directly.
 */
async function chooseTheme(page: Page, label: "Dark" | "Light") {
  await page.getByText(label, { exact: true }).click();
  await expect(page.getByRole("radio", { name: label })).toBeChecked();
}

/** The account ledger's balance, revealed past the privacy mask. */
async function revealedBalance(page: Page): Promise<string> {
  const masked = region(page, "Accounts").getByRole("button", { name: /₹/ }).first();
  if ((await masked.innerText()).includes("x")) await masked.click();
  return (await masked.innerText()).trim();
}

test.describe("Account Settings", () => {
  test("privacy mode can be turned off, and the choice survives a reload", async ({ page, user, signIn }) => {
    await signIn(user);
    await seedLedger(user.id);

    await page.goto("/");
    await expectAppPage(page);
    // Default on (PRD §2): the balance arrives masked.
    await expect(region(page, "Accounts").getByRole("button", { name: /₹xx/ })).toBeVisible();

    await page.getByRole("link", { name: "Account settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    const privacy = page.getByRole("switch", { name: "Privacy mode" });
    await expect(privacy).toHaveAttribute("aria-checked", "true");
    await privacy.click();
    await expect(privacy).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByRole("switch", { name: "Privacy mode" })).toHaveAttribute("aria-checked", "false");

    // It is the stored setting that changed, not just the switch.
    const { data } = await adminClient().from("users").select("privacy_mode_enabled").eq("id", user.id).single();
    expect(data!.privacy_mode_enabled).toBe(false);

    await page.goto("/");
    await expect(region(page, "Accounts").getByRole("button", { name: /₹xx/ })).toHaveCount(0);
  });

  test("the theme can be switched to light and stays switched", async ({ page, user, signIn }) => {
    await signIn(user);
    await page.goto("/settings");
    await expectAppPage(page);

    const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(await isDark(), "dark is the default (M8a)").toBe(true);

    // Clicked by its label, which is what a person clicks: the radio itself is
    // sr-only and sits under the label, so the label intercepts the pointer.
    await chooseTheme(page, "Light");
    expect(await isDark()).toBe(false);

    // Persisted, and applied before paint on the next load rather than after.
    await page.reload();
    expect(await isDark(), "light survives a reload").toBe(false);
    await page.goto("/");
    expect(await isDark(), "light applies across pages").toBe(false);

    await page.goto("/settings");
    await chooseTheme(page, "Dark");
    expect(await isDark()).toBe(true);
  });

  /** D-18: the row exists so the gap is visible, and does nothing. */
  test("the PIN row is visibly inactive", async ({ page, user, signIn }) => {
    await signIn(user);
    await page.goto("/settings");
    await expectAppPage(page);

    const security = region(page, "Security");
    await expect(security).toContainText("Not set up");
    await expect(security.getByRole("button")).toHaveCount(0);
    await expect(security.getByRole("textbox")).toHaveCount(0);
    await expect(security.locator('input[type="password"]')).toHaveCount(0);
  });
});

test.describe("the Dashboard date range", () => {
  test("scopes the period block and leaves every position untouched", async ({ page, user, signIn }) => {
    await signIn(user);
    await seedLedger(user.id);

    await page.goto("/");
    await expectAppPage(page);

    // 50,000 income − 450.50 expense − 111 expense + 2,222 income, all of it.
    const balanceBefore = await revealedBalance(page);
    expect(balanceBefore).toContain("₹51,660.50");
    const activityBefore = await region(page, "Recent transactions").innerText();

    await test.step("the default view is the current cycle", async () => {
      await expect(page.getByText("Spend burn-down")).toBeVisible();
    });

    await test.step("a window that is not a cycle changes the block's shape", async () => {
      // Scoped to the form: bare getByLabel("To") also matches the Next.js dev
      // -tools button, which only exists in the dev server the suite runs.
      const range = form(page, "Date range");
      await range.getByLabel("From").fill(LONG_AGO_START);
      await range.getByLabel("To").fill(LONG_AGO_END);
      await range.getByRole("button", { name: "Apply" }).click();
      await expectAppPage(page);

      // §8's "raw totals" (audit Q3): spend and income, and nothing else.
      await expect(page.getByText("Selected period").first()).toBeVisible();
      await expect(page.getByText("Spend burn-down")).toHaveCount(0);
      await expect(page.getByText("Available to spend")).toHaveCount(0);
      await expect(page.getByText("Budget ceiling this cycle")).toHaveCount(0);
      await expect(page.getByText("Earmarked (due, unconfirmed)")).toHaveCount(0);

      // Scoped to the block: these amounts ALSO appear in the activity feed,
      // which is the design working — the feed is not range-scoped.
      const block = region(page, "Selected period");
      await expect(block.getByText("₹111.00")).toBeVisible();
      await expect(block.getByText("₹2,222.00")).toBeVisible();
    });

    await test.step("the account balance is a position and did not move", async () => {
      // The single most important semantic rule in the M8 spec.
      expect(await revealedBalance(page)).toBe(balanceBefore);
    });

    await test.step("recent activity is still a feed of the latest entries", async () => {
      // A date picker must not silently turn a feed into a period query.
      expect(await region(page, "Recent transactions").innerText()).toBe(activityBefore);
    });

    await test.step("the window is in the URL, so it survives a reload", async () => {
      expect(page.url()).toContain(`from=${LONG_AGO_START}`);
      await page.reload();
      await expect(region(page, "Selected period").getByText("₹111.00")).toBeVisible();
    });

    await test.step("returning to the cycle restores the burn-down", async () => {
      await page.getByRole("link", { name: "Back to current cycle" }).click();
      await expect(page.getByText("Spend burn-down")).toBeVisible();
      expect(await revealedBalance(page)).toBe(balanceBefore);
    });
  });

  test("a range that cannot be honoured falls back to the cycle", async ({ page, user, signIn }) => {
    await signIn(user);
    await seedLedger(user.id);

    // Start after end: never silently swapped into a window nobody chose.
    await page.goto(`/?from=${LONG_AGO_END}&to=${LONG_AGO_START}`);
    await expectAppPage(page);
    await expect(page.getByText("Spend burn-down")).toBeVisible();
  });
});
