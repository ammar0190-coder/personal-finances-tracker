import { test as base, expect, type Locator, type Page } from "@playwright/test";
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

/**
 * The dropdown whose accessible name is `name` — i.e. the one its visible
 * <Label htmlFor> points at.
 *
 * Deliberately not "the Nth combobox inside the card titled X": that broke the
 * moment a card was renamed, reordered or replaced by a sheet, which is exactly
 * what M8 does. A label is what the user reads, so it is what the test asks for.
 */
export function combobox(scope: Page | Locator, name: string | RegExp) {
  return scope.getByRole("combobox", { name });
}

/**
 * A form by its accessible name. Forms carry `aria-label` so a field can be
 * scoped to the form that owns it — the dashboard has two "Amount" fields, and
 * naming the form is what keeps them apart without reaching for an id.
 */
export function form(page: Page, name: string | RegExp) {
  return page.getByRole("form", { name });
}

/** Pick `option` in the dropdown labelled `name`. */
export async function pick(scope: Page | Locator, name: string | RegExp, option: string | RegExp) {
  const page = "page" in scope ? scope.page() : scope;
  await combobox(scope, name).click();
  await page.getByRole("option", { name: option }).first().click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

/** The label text currently shown in the closed dropdown labelled `name`. */
export function comboboxValue(scope: Page | Locator, name: string | RegExp) {
  return combobox(scope, name).locator('[data-slot="select-value"]');
}

/**
 * A named region of a page — the app marks these with `<section aria-label>`,
 * so the test asks for the landmark rather than for `[data-slot="card"]`.
 * A card becoming a plain list (M8) leaves the region intact.
 */
export function region(page: Page, name: string | RegExp) {
  return page.getByRole("region", { name });
}

/** Every visible closed dropdown shows a label, never a raw UUID. */
export async function expectNoRawIdsInDropdowns(page: Page) {
  for (const text of await page.getByRole("combobox").allInnerTexts()) {
    expect(text, "dropdown shows a raw id").not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  }
}
