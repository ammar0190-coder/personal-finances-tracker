import { test as base, expect, type Page } from "@playwright/test";
import { HOSTED_SUPABASE, createTestUser, deleteTestUser, sessionCookies, type TestUser } from "./local-supabase";

export interface AppGuard {
  /** Browser console errors and uncaught page errors seen so far. */
  consoleErrors: string[];
  /** Requests to a hosted Supabase project (blocked, and a failure). */
  hostedRequests: string[];
  /** Arrivals on /auth/login that the test didn't declare. */
  unexpectedLoginRedirects: string[];
  /** Run `action`, during which landing on /auth/login is expected. */
  expectingLoginPage<T>(action: () => Promise<T>): Promise<T>;
}

interface Fixtures {
  user: TestUser;
  guard: AppGuard;
  signIn: (user: TestUser) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  user: async ({}, provide, testInfo) => {
    const user = await createTestUser(testInfo.title.replace(/\W+/g, "-").slice(0, 30).toLowerCase());
    await provide(user);
    await deleteTestUser(user);
  },

  // Automatic: every test is guarded, whether or not it asks for `guard`.
  guard: [
    async ({ page }, provide) => {
      let loginAllowed = 0;
      const guard: AppGuard = {
        consoleErrors: [],
        hostedRequests: [],
        unexpectedLoginRedirects: [],
        async expectingLoginPage(action) {
          loginAllowed += 1;
          try {
            return await action();
          } finally {
            loginAllowed -= 1;
          }
        },
      };
      await page.context().route(HOSTED_SUPABASE, (route) => {
        guard.hostedRequests.push(route.request().url());
        return route.abort("blockedbyclient");
      });
      page.on("console", (message) => {
        if (message.type() === "error") guard.consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => guard.consoleErrors.push(String(error)));
      page.on("framenavigated", (frame) => {
        if (frame !== page.mainFrame()) return;
        if (new URL(frame.url()).pathname.startsWith("/auth/login") && loginAllowed === 0) {
          guard.unexpectedLoginRedirects.push(frame.url());
        }
      });

      await provide(guard);

      expect(guard.hostedRequests, "requests to hosted Supabase").toEqual([]);
      expect(guard.unexpectedLoginRedirects, "unexpected redirects to login").toEqual([]);
      expect(guard.consoleErrors, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],

  signIn: async ({ page, baseURL }, provide) => {
    await provide(async (user) => {
      await page.context().addCookies(await sessionCookies(user, baseURL!));
    });
  },
});

export { expect };

/** Assert the page is the app, not the login screen or an error page. */
export async function expectAppPage(page: Page) {
  await expect(page, "should not be on the login page").not.toHaveURL(/\/auth\/login/);
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0);
}

/** Pick an option in the Nth dropdown inside the card titled `cardTitle`. */
export async function pick(page: Page, cardTitle: string, index: number, option: string | RegExp) {
  const card = page.locator('[data-slot="card"]', { has: page.getByText(cardTitle, { exact: true }) });
  await card.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: option }).first().click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

/** The label shown in the Nth closed dropdown inside the card titled `cardTitle`. */
export function combobox(page: Page, cardTitle: string, index: number) {
  return page
    .locator('[data-slot="card"]', { has: page.getByText(cardTitle, { exact: true }) })
    .getByRole("combobox")
    .nth(index)
    .locator('[data-slot="select-value"]');
}

/** Every visible closed dropdown shows a label, never a raw UUID. */
export async function expectNoRawIdsInDropdowns(page: Page) {
  for (const text of await page.getByRole("combobox").allInnerTexts()) {
    expect(text, "dropdown shows a raw id").not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  }
}
