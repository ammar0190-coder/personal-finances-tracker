"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  getServerTheme,
  readStoredTheme,
  subscribeToTheme,
  type Theme,
} from "@/lib/theme";

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/**
 * M8 design spec §4.1. Radio inputs rather than a hand-rolled segmented
 * control: picking one of two named states is exactly what a radio group is,
 * and the browser gives keyboard behaviour and announcement for free.
 *
 * The theme is read with `useSyncExternalStore` because it lives in
 * localStorage, not in React. The server snapshot is `dark` — what the server
 * actually renders on <html> — so the first client render agrees with the
 * markup instead of mismatching on every light-theme load.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, readStoredTheme, getServerTheme);

  return (
    <fieldset className="flex rounded-lg bg-secondary p-0.5">
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label }) => (
        <label
          key={value}
          className={
            theme === value
              ? "cursor-pointer rounded-md bg-background px-3 py-1.5 text-xs font-medium"
              : "cursor-pointer rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          }
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => applyTheme(value)}
            className="sr-only"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
