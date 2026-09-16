/**
 * PRD §8's "Settings (tucked into Account Settings, not on the dashboard
 * itself)" — privacy-mode configuration and PIN setup — plus the theme toggle
 * and the per-user timezone of §10.11. None of these had a surface before M8c,
 * which is why two PRD MVP settings had never been reachable.
 *
 * The PIN row is inert on purpose: D-18 and the M8 design spec §5. Its test
 * here is about what a person can see and reach; the architectural half — that
 * no code path touches `pin_hash` at all — is `src/app/__tests__/pin-boundary.test.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { canonicalTimezone } from "@/lib/timezones";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/lib/actions/settings", () => ({
  setPrivacyMode: async () => {},
  setTimezone: async () => {},
}));

const { PrivacyModeToggle } = await import("@/components/settings/privacy-mode-toggle");
const { ThemeToggle } = await import("@/components/settings/theme-toggle");
const { TimezoneSelect } = await import("@/components/settings/timezone-select");
const { PinRow } = await import("@/components/settings/pin-row");

describe("privacy mode toggle", () => {
  it("is a switch, so its on/off state is announced", () => {
    const html = renderToStaticMarkup(<PrivacyModeToggle enabled={true} />);
    expect(html).toMatch(/role="switch"/);
  });

  it("reflects privacy mode being on", () => {
    expect(renderToStaticMarkup(<PrivacyModeToggle enabled={true} />)).toMatch(/aria-checked="true"/);
  });

  it("reflects privacy mode being off", () => {
    expect(renderToStaticMarkup(<PrivacyModeToggle enabled={false} />)).toMatch(/aria-checked="false"/);
  });
});

describe("theme toggle", () => {
  const html = () => renderToStaticMarkup(<ThemeToggle />);

  it("offers dark and light as a single-choice group", () => {
    expect(html()).toMatch(/type="radio"/);
    expect(html()).toContain("Dark");
    expect(html()).toContain("Light");
  });

  /**
   * The server cannot know the stored choice — it lives in localStorage — so
   * the markup must match what the server renders on <html>, which is dark.
   * Anything else is a hydration mismatch on every light-theme load.
   */
  it("renders with dark selected, matching the server-rendered theme", () => {
    const dark = html().match(/<input[^>]*value="dark"[^>]*>/)![0];
    const light = html().match(/<input[^>]*value="light"[^>]*>/)![0];
    expect(dark).toMatch(/checked/);
    expect(light).not.toMatch(/checked/);
  });
});

describe("timezone select", () => {
  /**
   * Asserted through `canonicalTimezone` rather than against the literal
   * "Asia/Kolkata", because the runtime lists the legacy alias and the point
   * is that the SELECT resolves to the right zone — not that a particular
   * spelling survives. Hard-coding the spelling would make this test fail on a
   * runtime whose ICU data prefers the modern name, which is not a defect.
   */
  it("shows the user's stored zone as the current one, whichever alias the runtime lists", () => {
    const html = renderToStaticMarkup(<TimezoneSelect timezone="Asia/Kolkata" />);
    const selected = html.match(/<option value="([^"]+)" selected/)![1];
    expect(selected).toBe(canonicalTimezone("Asia/Kolkata"));
    // The regression itself: an unmatched value makes a native select show its first option.
    expect(selected).not.toBe("Africa/Abidjan");
  });

  it("offers real IANA zones to choose from", () => {
    const html = renderToStaticMarkup(<TimezoneSelect timezone="Asia/Kolkata" />);
    expect(html).toContain('value="Europe/London"');
    expect(html).toContain('value="America/New_York"');
  });
});

describe("PIN row (D-18)", () => {
  const html = () => renderToStaticMarkup(<PinRow />);

  it("says plainly that no PIN is set up", () => {
    expect(html()).toContain("Not set up");
  });

  /**
   * "Visibly inactive" means a person can tell it does nothing — not a control
   * that looks live and silently fails.
   */
  it("exposes nothing a person can operate", () => {
    const markup = html();
    expect(markup).not.toMatch(/<input/);
    expect(markup).not.toMatch(/<button(?![^>]*disabled)/);
    expect(markup).not.toMatch(/<a\s/);
  });

  it("does not hint that entering a PIN here would do anything", () => {
    expect(html()).not.toMatch(/type="password"/);
  });
});
