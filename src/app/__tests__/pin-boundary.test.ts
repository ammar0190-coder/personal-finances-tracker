/**
 * D-18 / M8 design spec §5 — the architectural boundary, not a behavioural
 * check.
 *
 * PRD §2 specifies a quick-unlock PIN and `users.pin_hash` exists in the
 * schema, so the Settings screen is the obvious place to "just add it". A PIN
 * compared on the client exposes its own hash, and four digits is ten thousand
 * combinations — broken offline immediately. Doing it properly needs
 * server-side verification, a real hashing dependency and rate limiting, which
 * is its own milestone routed through `security-review`.
 *
 * A behavioural test would only prove today's UI happens not to call it. This
 * reads the runtime source instead, so wiring the Settings row up later fails
 * here rather than passing silently.
 *
 * Deliberately excluded, per the spec: `src/types/database.ts` (the generated
 * schema mirror, which already contains the column today), the migration that
 * defines it, and prose. A test that is red before any work begins gets
 * deleted rather than obeyed.
 *
 * Comments are stripped before scanning for the same reason — the PIN row's
 * own source explains at length why it is inert, and naming the column it must
 * not touch is the clearest way to say so. The invariant is "no CODE path
 * reaches `pin_hash`", not "the string may never appear under src/".
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "..", "..");

/** The generated schema mirror is a type declaration, not a code path. */
const EXCLUDED = new Set([path.join(SRC, "types", "database.ts")]);

/**
 * Comments out, string and code in.
 *
 * Written as a scanner rather than a regex on purpose: a regex that strips
 * `//` to end-of-line also eats the rest of a line containing a URL or a
 * string like `"a//b"`, which would let a real `pin_hash` on that same line
 * slip past unseen. A guard that can be silenced by an adjacent string is not
 * a guard. Exercised directly below.
 */
export function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let state: "code" | "line" | "block" | "single" | "double" | "template" = "code";

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (state === "code") {
      if (c === "/" && next === "/") { state = "line"; i += 2; continue; }
      if (c === "/" && next === "*") { state = "block"; i += 2; continue; }
      if (c === "'") state = "single";
      else if (c === '"') state = "double";
      else if (c === "`") state = "template";
      out += c;
      i += 1;
      continue;
    }

    if (state === "line") {
      if (c === "\n") { state = "code"; out += c; }
      i += 1;
      continue;
    }

    if (state === "block") {
      if (c === "*" && next === "/") { state = "code"; i += 2; continue; }
      // Keep newlines so line numbers in a failure still mean something.
      if (c === "\n") out += c;
      i += 1;
      continue;
    }

    // Inside a string literal: a quote ends it, a backslash escapes the next char.
    if (c === "\\") { out += source.slice(i, i + 2); i += 2; continue; }
    if ((state === "single" && c === "'") || (state === "double" && c === '"') || (state === "template" && c === "`")) {
      state = "code";
    }
    out += c;
    i += 1;
  }

  return out;
}

function runtimeSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Tests are not runtime code — this file itself names the column.
      return entry === "__tests__" ? [] : runtimeSourceFiles(full);
    }
    if (!/\.tsx?$/.test(entry) || EXCLUDED.has(full)) return [];
    return [full];
  });
}

const files = runtimeSourceFiles(SRC);

describe("PIN boundary (D-18)", () => {
  it("scans the application source (guards against the test silently checking nothing)", () => {
    expect(files.length).toBeGreaterThan(40);
    const relative = files.map((f) => path.relative(SRC, f));
    expect(relative).toContain(path.join("app", "page.tsx"));
    expect(relative).toContain(path.join("lib", "supabase", "server.ts"));
    // The exclusion is real: the generated mirror does contain the column.
    expect(readFileSync(path.join(SRC, "types", "database.ts"), "utf8")).toContain("pin_hash");
    expect(relative).not.toContain(path.join("types", "database.ts"));
  });

  it("no application code path reads, writes, hashes or validates pin_hash", () => {
    const offenders = files.filter((f) => stripComments(readFileSync(f, "utf8")).includes("pin_hash"));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});

/**
 * The stripper is the one place this guard could be quietly defeated, so it is
 * tested rather than trusted.
 */
describe("stripComments", () => {
  it("removes line and block comments", () => {
    expect(stripComments("a // pin_hash\nb")).not.toContain("pin_hash");
    expect(stripComments("a /* pin_hash */ b")).not.toContain("pin_hash");
  });

  it("keeps code that follows a block comment on the same line", () => {
    expect(stripComments("/* note */ update({ pin_hash: x })")).toContain("pin_hash");
  });

  it("does not let a string containing // hide code after it", () => {
    // The exact bug a naive regex introduces.
    expect(stripComments('const u = "https://x"; update({ pin_hash: p });')).toContain("pin_hash");
  });

  it("does not let an apostrophe in a comment swallow the rest of the file", () => {
    expect(stripComments("// don't\nupdate({ pin_hash: p });")).toContain("pin_hash");
  });

  it("keeps a column name that genuinely appears in a string literal", () => {
    expect(stripComments('select("pin_hash")')).toContain("pin_hash");
  });
});
