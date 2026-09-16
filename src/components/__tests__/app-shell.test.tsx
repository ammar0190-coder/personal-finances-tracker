/**
 * The shell every authenticated page renders inside (M8a): one main landmark,
 * one page title in the display serif, and the navigation present on every
 * page rather than only where someone remembered to add links.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/auth/logout-button", () => ({ LogoutButton: () => <button type="button">Sign out</button> }));

const { AppShell } = await import("@/components/shell/app-shell");

const html = () => renderToStaticMarkup(<AppShell title="Dashboard">{<p>content</p>}</AppShell>);

describe("app shell", () => {
  it("renders the page title as the single h1", () => {
    const headings = [...html().matchAll(/<h1[^>]*>(.*?)<\/h1>/g)];
    expect(headings).toHaveLength(1);
    expect(headings[0][1]).toContain("Dashboard");
  });

  it("puts the title in the display serif, not the body face", () => {
    expect(html()).toMatch(/<h1[^>]*class="[^"]*font-heading/);
  });

  it("exposes exactly one main landmark, holding the page content", () => {
    const mains = [...html().matchAll(/<main[^>]*>/g)];
    expect(mains).toHaveLength(1);
    expect(html()).toContain("content");
  });

  it("includes the navigation, exactly once", () => {
    expect([...html().matchAll(/<nav[^>]*aria-label="Main"/g)]).toHaveLength(1);
  });

  it("leaves room for the bottom bar so content is not hidden behind it", () => {
    expect(html()).toMatch(/<main[^>]*class="[^"]*pb-/);
  });

  /**
   * M8 design spec: "Settings lives in the header, not the tab bar. It is
   * opened rarely and does not deserve equal weight." The four modules in the
   * bar are guarded separately by app-nav.test.tsx.
   */
  it("reaches Account Settings from the header", () => {
    expect(html()).toMatch(/<a[^>]*href="\/settings"/);
  });

  it("gives the settings link a name, not just an icon", () => {
    // An icon-only link with no accessible name is unusable by screen reader
    // and unaddressable by the E2E suite.
    const link = html().match(/<a[^>]*href="\/settings"[^>]*>/)![0];
    expect(link).toMatch(/aria-label="[^"]*Settings/i);
  });
});
