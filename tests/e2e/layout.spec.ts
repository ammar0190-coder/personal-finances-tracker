/**
 * The app is phone-first and installed as a PWA (PRD §14, M8 design spec), so
 * a page wider than the viewport is a defect, not a cosmetic nit: it produces
 * sideways scrolling on every screen and pushes controls off the edge.
 *
 * Found by looking at a screenshot during M8c, which is how the two previous
 * rounds of defects were found too. The header already overflowed by 23px at
 * 390px before M8c added the settings gear, which took it to 67px — so this
 * guards a real regression that a green suite had happily reported as fine.
 */
import { adminClient } from "./support/local-supabase";
import { expect, expectAppPage, test } from "./support/fixtures";

/** iPhone 12/13/14 logical width — the narrowest mainstream phone worth targeting. */
const PHONE = { width: 390, height: 844 };

interface Overflow {
  viewport: number;
  documentWidth: number;
  offenders: string[];
}

async function measureOverflow(page: import("@playwright/test").Page): Promise<Overflow> {
  return page.evaluate(() => {
    const offenders: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;
      if (rect.right > window.innerWidth + 1 || rect.left < -1) {
        const className = typeof el.className === "string" ? el.className : "";
        offenders.push(`<${el.tagName.toLowerCase()} class="${className.slice(0, 70)}"> right=${Math.round(rect.right)}`);
      }
    }
    return { viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth, offenders };
  });
}

test("no page scrolls sideways at phone width", async ({ page, user, signIn }) => {
  await signIn(user);
  const admin = adminClient();

  // A realistic account name, not a short one: the header and the account
  // ledger both size themselves from content.
  const { error } = await admin
    .from("accounts")
    .insert({ user_id: user.id, name: "HDFC Spending", account_type: "bank", is_spend_account: true });
  if (error) throw error;

  await page.setViewportSize(PHONE);

  for (const path of ["/", "/settings", "/investments", "/iou", "/reports"]) {
    await page.goto(path);
    await expectAppPage(page);
    const { viewport, documentWidth, offenders } = await measureOverflow(page);
    expect(
      documentWidth,
      `${path} is ${documentWidth}px wide in a ${viewport}px viewport. Overflowing: ${offenders.join(" | ") || "none identified"}`,
    ).toBeLessThanOrEqual(viewport);
  }
});

/**
 * The account ledger is "the most important thing on the screen" (M8 design
 * spec §3.1.1), and at 390px the account name ran straight into its balance
 * with no gap at all — `HDFC Spending₹xx,xx,xxx`. The page still fit the
 * viewport, so the overflow test above never saw it; it was found by looking
 * at a screenshot.
 *
 * Measured in the page rather than through locators: this is a question about
 * rectangles, and reading them directly gives a failure message that says how
 * many pixels short the row is.
 *
 * Measured before it was asserted, which changed the assertion: the name's box
 * ended at 138px and the balance's began at 138px — the gap was exactly ZERO,
 * not negative. A plain "they do not overlap" check passes on the broken
 * layout, so this requires real separation instead.
 *
 * Two assertions, because there are two ways to get this wrong. The row needs
 * a genuine gap, AND an ordinary name must survive at a readable width — a
 * "fix" that simply lets every name truncate to nothing satisfies the first
 * on its own.
 */
test("the account name never collides with its balance at phone width", async ({ page, user, signIn }) => {
  await signIn(user);
  const admin = adminClient();

  // Both rows carry every key: PostgREST normalises columns across a multi-row
  // insert, so a key present on only one row is sent as null on the other —
  // and `is_spend_account` is NOT NULL.
  const { error } = await admin.from("accounts").insert([
    // A name of ordinary length, and one long enough to force truncation.
    { user_id: user.id, name: "HDFC Spending", account_type: "bank", is_spend_account: true },
    { user_id: user.id, name: "Kotak Mahindra Joint Savings Account", account_type: "credit_card", is_spend_account: false },
  ]);
  if (error) throw error;

  await page.setViewportSize(PHONE);
  await page.goto("/");
  await expectAppPage(page);
  await page.getByRole("region", { name: "Accounts" }).waitFor();

  const rows = await page.evaluate(() => {
    const region = document.querySelector('section[aria-label="Accounts"]')!;
    const balances = [...region.querySelectorAll("button")].filter((b) => b.textContent?.trim().startsWith("₹"));

    return balances.map((balance) => {
      // The row is the nearest ancestor that also contains a name element.
      let row: HTMLElement = balance.parentElement!;
      while (row && !row.querySelector("p")) row = row.parentElement!;
      const name = row.querySelector("p")! as HTMLElement;

      const nameRect = name.getBoundingClientRect();
      const balanceRect = balance.getBoundingClientRect();
      return {
        name: name.textContent?.trim() ?? "",
        nameRight: Math.round(nameRect.right),
        nameWidth: Math.round(nameRect.width),
        balanceLeft: Math.round(balanceRect.left),
      };
    });
  });

  expect(rows.length, "expected two account rows").toBe(2);

  // 8px, comfortably under the design system's gap-3 (12px) but far enough
  // above zero that "they merely touch" cannot pass.
  const MIN_GAP = 8;
  for (const row of rows) {
    const gap = row.balanceLeft - row.nameRight;
    expect(gap, `"${row.name}" leaves a ${gap}px gap before its balance`).toBeGreaterThanOrEqual(MIN_GAP);
  }

  const ordinary = rows.find((r) => r.name.startsWith("HDFC"))!;
  expect(ordinary.nameWidth, `"${ordinary.name}" is crushed to ${ordinary.nameWidth}px`).toBeGreaterThan(70);
});
