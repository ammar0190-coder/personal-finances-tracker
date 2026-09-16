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
