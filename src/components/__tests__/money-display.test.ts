/**
 * Every monetary amount shown in the UI goes through formatMoney
 * (src/lib/ledger/format.ts). A hand-built "₹" + value skips the fixed two
 * decimals and digit grouping, so the rupee sign followed by an interpolation
 * is not allowed anywhere in the UI source.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(import.meta.dirname, "../..");

function uiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : uiFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

describe("money display", () => {
  // `₹{value}` in JSX or `₹${value}` in a template string.
  const handBuilt = /₹\$?\{/;

  const offenders = uiFiles(srcRoot).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ line: line.trim(), at: `${path.relative(srcRoot, file)}:${i + 1}` }))
      .filter(({ line }) => handBuilt.test(line))
      .map(({ line, at }) => `${at}  ${line}`),
  );

  it("never builds a ₹ amount by hand", () => {
    expect(offenders).toEqual([]);
  });
});
