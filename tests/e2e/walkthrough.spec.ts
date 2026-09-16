/**
 * A brand-new user, end to end, against the local app and local Supabase:
 * onboarding, categories, an account, income and expense, the dashboard,
 * investments, IOU and reports, then persistence across a reload and across
 * sign-out and sign-in. The fixtures fail any test that reaches hosted
 * Supabase, lands on the login page unexpectedly, or logs a console error.
 *
 * Run: npx supabase start && npm run test:e2e
 */
import type { Page, TestInfo } from "@playwright/test";
import { E2E_SUPABASE_URL, HOSTED_PROJECT_URL, adminClient, assertLocalSupabase } from "./support/local-supabase";
import { comboboxValue, expect, expectAppPage, expectNoRawIdsInDropdowns, form, pick, region, test } from "./support/fixtures";

async function snapshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}


test.describe("environment safety", () => {
  test("the guard refuses hosted Supabase URLs", () => {
    expect(() => assertLocalSupabase("https://abcdefghijklmnopqrst.supabase.co")).toThrow(/Refusing/);
    expect(() => assertLocalSupabase(E2E_SUPABASE_URL)).not.toThrow();
  });

  test("the app under test is built against local Supabase", async ({ request }) => {
    const html = await (await request.get("/auth/login")).text();
    const scripts = [...new Set(html.match(/\/_next\/static\/[^"]+\.js/g) ?? [])];
    expect(scripts.length).toBeGreaterThan(0);
    const bundle = (await Promise.all(scripts.map(async (src) => (await request.get(src)).text()))).join("\n");
    expect(bundle).toContain(E2E_SUPABASE_URL);
    expect(bundle).not.toMatch(HOSTED_PROJECT_URL);
  });
});

test("new user: onboarding to reports, persisted across reload and re-login", async ({
  page,
  user,
  signIn,
  guard,
}, testInfo) => {
  await signIn(user);

  await test.step("onboarding shows for a user with no accounts", async () => {
    await page.goto("/");
    await expectAppPage(page);
    await expect(region(page, "Set up your accounts")).toBeVisible();
    await snapshot(page, testInfo, "01-onboarding");
  });

  await test.step("load starter categories", async () => {
    await page.getByRole("button", { name: "Load starter categories" }).click();
    await expect(page.getByText(/categories ready/)).toBeVisible();
  });

  await test.step("add a spend bank account", async () => {
    const accountForm = form(page, "Add an account");
    await expect(comboboxValue(accountForm, "Account type")).toHaveText("Bank");
    await accountForm.getByLabel("Name", { exact: true }).fill("HDFC");
    await accountForm.getByRole("checkbox", { name: /Spend account/ }).check();
    await page.getByRole("button", { name: "Add account" }).click();
    await expect(region(page, "Accounts")).toBeVisible();
    await expectAppPage(page);
  });

  await test.step("log income: dropdowns show labels", async () => {
    // PRD §8's quick-add: the form is not on the dashboard, it opens on demand.
    // Income is a secondary type, so it lives behind the adjacent menu.
    await page.getByRole("button", { name: "Other transaction types" }).click();
    await page.getByRole("menuitem", { name: "Income" }).click();
    const txn = form(page, "Log a transaction");
    await expect(txn).toBeVisible();
    await pick(txn, "Type", "Income");
    await expect(comboboxValue(txn, "Type")).toHaveText("Income");
    await pick(txn, "Account", "HDFC");
    await expect(comboboxValue(txn, "Account")).toHaveText("HDFC");
    await pick(txn, "Category", /^Salary/);
    await expect(comboboxValue(txn, "Category")).toHaveText("Salary (blended)");
    await expectNoRawIdsInDropdowns(page);
    await snapshot(page, testInfo, "02-income-form-filled");

    await txn.getByLabel("Amount").fill("50000");
    await page.getByRole("button", { name: "Log income now" }).click();
    await expect(page.getByText("₹50,000.00")).toBeVisible();
  });

  await test.step("log expense against a subcategory", async () => {
    // Expense is the prominent action — one tap, no menu.
    await page.getByRole("button", { name: "Add expense" }).click();
    const txn = form(page, "Log a transaction");
    await expect(txn).toBeVisible();
    await pick(txn, "Type", "Expense");
    await expect(comboboxValue(txn, "Type")).toHaveText("Expense");
    await pick(txn, "Account", "HDFC");
    await pick(txn, "Category", "Swiggy/Zomato");
    await expect(comboboxValue(txn, "Category")).toHaveText("Swiggy/Zomato");
    await expectNoRawIdsInDropdowns(page);

    await txn.getByLabel("Amount").fill("450.5");
    await page.getByRole("button", { name: "Log expense now" }).click();
    await expect(page.getByText("₹450.50")).toBeVisible();
  });

  await test.step("database keeps stored values, not labels", async () => {
    const { data, error } = await adminClient()
      .from("transactions")
      .select("type, amount, category:categories(name), account:accounts!transactions_account_id_fkey(name)")
      .eq("user_id", user.id)
      .order("amount");
    expect(error).toBeNull();
    expect(data).toEqual([
      { type: "expense", amount: 450.5, category: { name: "Swiggy/Zomato" }, account: { name: "HDFC" } },
      { type: "income", amount: 50000, category: { name: "Salary" }, account: { name: "HDFC" } },
    ]);
    const { data: accounts } = await adminClient().from("accounts").select("account_type").eq("user_id", user.id);
    expect(accounts).toEqual([{ account_type: "bank" }]);
  });

  await test.step("dashboard balance is masked, then reveals formatted", async () => {
    const balance = page.getByRole("button", { name: "₹xx,xx,xxx" });
    await expect(balance).toBeVisible();
    await balance.click();
    await expect(page.getByRole("button", { name: "₹49,549.50" })).toBeVisible();
    await snapshot(page, testInfo, "03-dashboard");
  });

  await test.step("transactions survive a reload", async () => {
    await page.reload();
    await expectAppPage(page);
    const recent = region(page, "Recent transactions");
    await expect(recent.getByText("₹50,000.00")).toBeVisible();
    await expect(recent.getByText("₹450.50")).toBeVisible();
    await expect(recent.getByText("Swiggy/Zomato")).toBeVisible();
  });

  await test.step("investments: add an instrument and log a contribution", async () => {
    await page.goto("/investments");
    await expectAppPage(page);
    await page.getByText("Add a new instrument").click();
    const instrumentForm = form(page, "Add an instrument");
    await expect(comboboxValue(instrumentForm, "Vehicle type")).toHaveText("Mutual Fund");
    await instrumentForm.getByLabel("Name", { exact: true }).fill("Nifty Index Fund");
    await page.getByRole("button", { name: "Add instrument" }).click();
    const holding = page.getByRole("listitem").filter({ hasText: "Nifty Index Fund" });
    await expect(holding).toContainText("₹0.00");

    await page.getByText("Log a contribution").click();
    const contribution = form(page, "Log a contribution");
    await expect(comboboxValue(contribution, "Instrument")).toHaveText("Nifty Index Fund");
    // The form defaults to the first account; it must be shown by name.
    await expect(comboboxValue(contribution, "From account")).toHaveText("HDFC");
    await contribution.getByLabel("Amount").fill("1000");
    await page.getByRole("button", { name: "Log contribution" }).click();
    await expect(holding).toContainText("₹1,000.00");
    await expectNoRawIdsInDropdowns(page);
    await snapshot(page, testInfo, "04-investments");
  });

  await test.step("IOU: add a payable", async () => {
    await page.goto("/iou");
    await expectAppPage(page);
    await page.getByRole("tab", { name: /Payables/ }).click();
    const payable = form(page, "Add a payable");
    await payable.getByLabel("Who fronted it").fill("Ravi");
    await payable.getByLabel("Your share").fill("250");
    await page.getByRole("button", { name: "Add payable" }).click();
    await expect(page.getByRole("tab", { name: "Payables (1)" })).toBeVisible();
    await expect(page.getByText("₹0.00 / ₹250.00")).toBeVisible();
    await expect(page.getByLabel("Net you owe")).toHaveText("₹250.00");
    await snapshot(page, testInfo, "05-iou");
  });

  await test.step("reports reflect the logged spend", async () => {
    await page.goto("/reports");
    await expectAppPage(page);
    await expect(region(page, "Category breakdown")).toBeVisible();
    const chart = page.locator(".recharts-wrapper").first();
    await expect(chart.getByText("Food", { exact: true })).toBeVisible();
    await chart.locator(".recharts-rectangle").first().click();
    const drillDown = page.getByRole("listitem").filter({ hasText: "Swiggy/Zomato" });
    await expect(drillDown).toContainText("₹450.50");
    await expect(page.getByText(/moved into savings/)).toContainText("₹0.00");
    await snapshot(page, testInfo, "06-reports");
  });

  await test.step("sign out ends the session", async () => {
    await page.goto("/");
    await guard.expectingLoginPage(async () => {
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/auth\/login/);
      await page.goto("/");
      await expect(page, "signed-out visit to / goes to login").toHaveURL(/\/auth\/login/);
    });
  });

  await test.step("signing back in shows the same data", async () => {
    await page.context().clearCookies();
    await signIn(user);
    await page.goto("/");
    await expectAppPage(page);
    await expect(page.getByText("₹50,000.00")).toBeVisible();
    await expect(page.getByText("₹450.50")).toBeVisible();
    await page.getByRole("button", { name: "₹xx,xx,xxx" }).click();
    // 50,000 income − 450.50 expense − 1,000 investment; the payable doesn't touch the balance.
    await expect(page.getByRole("button", { name: "₹48,549.50" })).toBeVisible();
    await page.goto("/investments");
    await expect(page.getByRole("listitem").filter({ hasText: "Nifty Index Fund" })).toContainText("₹1,000.00");
    await page.goto("/iou");
    await expect(page.getByRole("tab", { name: "Payables (1)" })).toBeVisible();
    await snapshot(page, testInfo, "07-after-re-login");
  });
});

/**
 * M8's typography contract, checked in a real browser: Geist for body and UI,
 * Instrument Serif for display headings. Still guards the original bug — a
 * self-referencing --font-sans token that silently dropped the whole app to a
 * serif fallback — which is why body is asserted not to be a generic serif.
 */
test("body renders in Geist and display headings in Instrument Serif", async ({ page, user, signIn }) => {
  await signIn(user);
  await page.goto("/");
  await expectAppPage(page);
  const font = await page.evaluate(async () => {
    await document.fonts.ready;
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
    const heading = getComputedStyle(document.querySelector("h1")!).fontFamily;
    return { body: getComputedStyle(document.body).fontFamily, heading, loaded };
  });
  const primary = (family: string) => family.split(",")[0].replace(/["']/g, "").trim();

  expect(primary(font.body), "body face").toMatch(/Geist/);
  expect(primary(font.heading), "h1 face").toMatch(/Instrument.?Serif/i);
  // Both faces actually downloaded — a name in the stack proves nothing on its own.
  expect(font.loaded).toContain(primary(font.body));
  expect(font.loaded).toContain(primary(font.heading));
  // The original regression: a broken token drops the app to the generic serif.
  expect(font.body).not.toMatch(/^\s*(serif|Times)/i);
});

test("a signed-out visitor is sent to login", async ({ page, guard }) => {
  await guard.expectingLoginPage(async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});

test("an unexpected redirect to login fails the test", async ({ page }) => {
  // Deliberately undeclared: the guard fixture must turn this into a failure.
  test.fail();
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/login/);
});
