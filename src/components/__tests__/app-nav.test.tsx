/**
 * The app shell's navigation (M8a). PRD §8 asks for "navigation shortcuts into
 * every other module"; before M8 those were three underlined links with no
 * active state and nothing reachable once you scrolled.
 *
 * Rendered with react-dom/server, matching the house pattern — no DOM library,
 * no new dependency.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const { AppNav, DESTINATIONS } = await import("@/components/shell/app-nav");

function render(at: string) {
  pathname.current = at;
  return renderToStaticMarkup(<AppNav />);
}

describe("app navigation", () => {
  it("offers exactly the four PRD modules, Expense Log deliberately not among them", () => {
    // §8's quick-add exists so logging is an action, not a destination.
    expect(DESTINATIONS.map((d) => d.href)).toEqual(["/", "/investments", "/iou", "/reports"]);
  });

  it("links to every destination", () => {
    const html = render("/");
    for (const { href, label } of DESTINATIONS) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
  });

  it.each([
    ["/", "Dashboard"],
    ["/investments", "Investments"],
    ["/iou", "IOU"],
    ["/reports", "Reports"],
  ])("marks %s as the current page", (at, label) => {
    const html = render(at);
    const current = [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>(.*?)<\/a>/g)];
    expect(current).toHaveLength(1);
    expect(current[0][0]).toContain(label);
  });

  it("does not mark the dashboard current while on another module", () => {
    // "/" is a prefix of every path, so a naive startsWith marks it always.
    const html = render("/reports");
    expect(html).not.toMatch(/<a[^>]*href="\/"[^>]*aria-current="page"/);
  });

  it("signals the active tab by more than colour", () => {
    // Colour alone fails a colour-blind reader; aria-current carries it too.
    expect(render("/iou")).toContain('aria-current="page"');
  });
});
