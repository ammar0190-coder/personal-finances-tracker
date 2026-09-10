/**
 * Installability is the whole point of PRD §14's PWA line: Android's
 * install prompt is withheld unless the manifest carries a specific set of
 * fields, and a missing one fails silently in the browser.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("carries the fields Android requires before it will offer to install", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBeTruthy();
    expect(m.theme_color).toBeTruthy();
  });

  it("ships both icon sizes Android needs, including a maskable one", () => {
    const icons = m.icons ?? [];
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("declares every icon it references as a real PNG path under /icons/", () => {
    for (const icon of m.icons ?? []) {
      expect(icon.src).toMatch(/^\/icons\/[a-z0-9-]+\.png$/);
      expect(icon.type).toBe("image/png");
    }
  });

  it("ships every icon file it points at — a 404 here silently kills the install prompt", () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(process.cwd(), "public", icon.src);
      expect(existsSync(file), `missing ${icon.src}`).toBe(true);
    }
  });
});
