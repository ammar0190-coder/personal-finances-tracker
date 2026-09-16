/**
 * M8 design spec §4.1: the theme toggle is hand-rolled — a blocking inline
 * script that sets the class before first paint, plus localStorage
 * persistence. No `next-themes`; a dependency addition needs its own approval
 * (CLAUDE.md).
 *
 * Dark is the product default, not a mirror of the OS setting: M8a made dark
 * the ground the whole palette was designed against, and `prefers-color-scheme`
 * would silently put a light-OS user on the derived scale without ever asking.
 * The toggle is how light is reached.
 *
 * The server therefore renders `dark` and the script only ever has to REMOVE
 * it — so the common case paints with no work, and the light case still never
 * flashes, because the script blocks.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  THEME_INIT_SCRIPT,
  applyTheme,
  getServerTheme,
  readStoredTheme,
  resolveTheme,
  subscribeToTheme,
} from "@/lib/theme";

describe("resolveTheme", () => {
  it("defaults to dark when nothing has been chosen", () => {
    expect(resolveTheme(null)).toBe("dark");
  });

  it("honours a stored light preference", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("honours a stored dark preference", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("falls back to dark for a value it does not recognise", () => {
    // A stale or hand-edited key must not leave the app themeless.
    expect(resolveTheme("solarized")).toBe("dark");
  });
});

/**
 * Runs the real script text against a stand-in document, because a
 * string-match test would pass on a script that throws on line one.
 */
function runInitScript(stored: string | null | { throws: true }) {
  const classes = new Set(["dark"]); // what the server rendered
  const localStorage = {
    getItem: (key: string) => {
      if (typeof stored === "object" && stored?.throws) throw new Error("storage blocked");
      return key === THEME_STORAGE_KEY ? (stored as string | null) : null;
    },
  };
  const document = {
    documentElement: {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
      },
    },
  };
  new Function("document", "localStorage", THEME_INIT_SCRIPT)(document, localStorage);
  return classes;
}

describe("the blocking init script", () => {
  it("leaves the server-rendered dark class alone when nothing is stored", () => {
    expect(runInitScript(null)).toContain("dark");
  });

  it("removes the dark class when light is stored", () => {
    expect(runInitScript("light")).not.toContain("dark");
  });

  it("keeps dark when dark is stored", () => {
    expect(runInitScript("dark")).toContain("dark");
  });

  /**
   * Private windows and blocked site data make `localStorage` throw on
   * access, not return null. An unguarded read there is a script error in
   * <head>, which is the worst place in the document to have one.
   */
  it("still leaves a usable theme when localStorage throws", () => {
    expect(() => runInitScript({ throws: true })).not.toThrow();
    expect(runInitScript({ throws: true })).toContain("dark");
  });

  it("carries no newlines that would break it inside a JSX string", () => {
    expect(THEME_INIT_SCRIPT).not.toContain("\n");
  });
});

/**
 * Applying a theme at runtime. Stubs the two browser globals rather than
 * wrapping them in an injectable seam: the seam would exist only for the test,
 * and these are exactly the globals the real code must get right.
 */
function withBrowser(options: { storageThrows?: boolean } = {}) {
  const classes = new Set<string>(["dark"]);
  const stored = new Map<string, string>();
  vi.stubGlobal("document", {
    documentElement: {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
      },
    },
  });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (options.storageThrows) throw new Error("storage blocked");
      stored.set(k, v);
    },
  });
  return { classes, stored };
}

describe("applyTheme", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("switching to light drops the dark class and remembers the choice", () => {
    const { classes, stored } = withBrowser();
    applyTheme("light");
    expect(classes).not.toContain("dark");
    expect(stored.get(THEME_STORAGE_KEY)).toBe("light");
  });

  it("switching back to dark restores the class and remembers the choice", () => {
    const { classes, stored } = withBrowser();
    applyTheme("light");
    applyTheme("dark");
    expect(classes).toContain("dark");
    expect(stored.get(THEME_STORAGE_KEY)).toBe("dark");
  });

  /**
   * The visible change must not be hostage to storage succeeding. In a private
   * window the preference cannot be remembered, but the toggle must still
   * visibly do something rather than appearing dead.
   */
  it("still changes the theme when localStorage refuses to write", () => {
    const { classes } = withBrowser({ storageThrows: true });
    expect(() => applyTheme("light")).not.toThrow();
    expect(classes).not.toContain("dark");
  });
});

describe("readStoredTheme", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports the persisted choice", () => {
    withBrowser();
    applyTheme("light");
    expect(readStoredTheme()).toBe("light");
  });

  it("reports the default before anything has been chosen", () => {
    withBrowser();
    expect(readStoredTheme()).toBe("dark");
  });
});

/**
 * The theme is an external store — it lives in localStorage, not in React —
 * so the toggle reads it with `useSyncExternalStore` rather than an effect
 * that calls setState on mount. That is what lets the server snapshot be the
 * dark theme it actually rendered, and it means another tab switching themes
 * updates this one.
 */
describe("theme subscriptions", () => {
  afterEach(() => vi.unstubAllGlobals());

  function withWindow() {
    const handlers = new Set<() => void>();
    vi.stubGlobal("window", {
      addEventListener: (event: string, fn: () => void) => {
        if (event === "storage") handlers.add(fn);
      },
      removeEventListener: (event: string, fn: () => void) => {
        if (event === "storage") handlers.delete(fn);
      },
    });
    return { storageEvent: () => handlers.forEach((h) => h()) };
  }

  it("notifies subscribers when the theme changes in this tab", () => {
    withBrowser();
    withWindow();
    let notified = 0;
    subscribeToTheme(() => notified++);
    applyTheme("light");
    expect(notified).toBe(1);
  });

  it("notifies subscribers when another tab changes the theme", () => {
    withBrowser();
    const { storageEvent } = withWindow();
    let notified = 0;
    subscribeToTheme(() => notified++);
    storageEvent();
    expect(notified).toBe(1);
  });

  it("stops notifying once unsubscribed", () => {
    withBrowser();
    withWindow();
    let notified = 0;
    const unsubscribe = subscribeToTheme(() => notified++);
    unsubscribe();
    applyTheme("light");
    expect(notified).toBe(0);
  });

  it("reports the theme the server rendered, so hydration matches", () => {
    expect(getServerTheme()).toBe("dark");
  });
});
