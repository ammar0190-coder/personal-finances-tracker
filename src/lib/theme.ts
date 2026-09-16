/**
 * The theme, hand-rolled (M8 design spec §4.1). No `next-themes` — this is
 * about thirty lines, and a dependency addition needs its own approval
 * (CLAUDE.md).
 *
 * Dark is the product default rather than a mirror of `prefers-color-scheme`:
 * the palette was designed against the near-black ground, and the light scale
 * derives from it. The toggle in Account Settings is how light is reached.
 */

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "finances.theme";

export const DEFAULT_THEME: Theme = "dark";

export function resolveTheme(stored: string | null | undefined): Theme {
  return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
}

/**
 * Runs in <head>, before first paint, so switching themes never flashes the
 * other one. The server renders `dark` on <html>, so this only ever has to
 * remove it — the default case costs nothing.
 *
 * Kept to a single line: it is embedded in JSX as a string. The whole body is
 * wrapped in try/catch because reading localStorage THROWS (rather than
 * returning null) in a private window or with site data blocked, and an
 * uncaught error here is an error in <head>.
 */
export const THEME_INIT_SCRIPT =
  `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light"){document.documentElement.classList.remove("dark")}}catch(e){}`;

/**
 * Apply a theme now, and remember it. The class change comes first
 * deliberately: persistence can fail (a private window, blocked site data)
 * and the toggle must still visibly work when it does, rather than looking
 * dead.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList[theme === "dark" ? "add" : "remove"]("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Unwritable storage costs the preference, not the theme.
  }
  // `storage` events only fire in OTHER tabs, so this tab has to say so itself.
  for (const listener of listeners) listener();
}

const listeners = new Set<() => void>();

/**
 * The theme lives in localStorage, which makes it an external store rather
 * than React state — so the toggle reads it with `useSyncExternalStore`
 * instead of an effect that calls setState on mount.
 *
 * Subscribing to `storage` as well means a theme switched in another tab
 * updates this one, which is free here and surprising by its absence.
 */
export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The server cannot read localStorage, and it renders `dark` on <html>, so
 * this is what the client must agree with on the first render. Correcting to
 * the stored choice happens immediately after, and the blocking init script
 * has already made the PAINTED theme right regardless.
 */
export function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

/** The persisted choice, or the default when there is none (or none readable). */
export function readStoredTheme(): Theme {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}
