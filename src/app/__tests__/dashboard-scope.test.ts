/**
 * What the Dashboard is allowed to show (PRD §6, §8, and the approved
 * date-range audit).
 *
 * These are read off the page's source rather than a render: they are rules
 * about what the page may *reach for*, and a component test cannot see an
 * import that was never supposed to exist.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(import.meta.dirname, "..", "page.tsx"), "utf8");
const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

describe("dashboard scope", () => {
  it("reads the page source (guards against the test silently checking nothing)", () => {
    expect(imports.length).toBeGreaterThan(5);
    expect(imports).toContain("@/lib/data/balances");
  });

  /**
   * PRD §6 and §8: "Investments — deliberately absent. Lives only in the
   * Investments module." An import of instrument or holdings data here is the
   * first step of that decision quietly eroding.
   */
  it("never reaches for investments data", () => {
    expect(imports).not.toContain("@/lib/data/instruments");
    expect(source).not.toMatch(/listInvestmentHoldings|listInstruments/);
  });

  /**
   * The audit's rule: account balances are a position, never range-scoped. The
   * balance query must not take period bounds.
   */
  it("asks for balances without a period", () => {
    expect(source).toMatch(/listAccountsWithBalances\(\)/);
  });

  /**
   * The audit's rule: recent activity is a feed of the latest N, not a window.
   */
  it("takes recent activity as a fixed-size feed, not a date range", () => {
    const call = source.match(/listTransactions\(\{([^}]*)\}\)/);
    expect(call, "recent activity query").not.toBeNull();
    expect(call![1]).toMatch(/limit:\s*\d+/);
    expect(call![1]).not.toMatch(/start|end|from|to|since/i);
  });
});
