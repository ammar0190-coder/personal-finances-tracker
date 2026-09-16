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
import { listAccountsWithBalances } from "@/lib/data/balances";
import { getIouSnapshot } from "@/lib/data/iou";

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

/**
 * M8c's date-range control (PRD §8, D-16). The audit approved it on exactly
 * one condition, and these are that condition made mechanical:
 *
 *   > The control scopes exactly one figure — spend-so-far, and only when the
 *   > selected window is not the current cycle.
 *
 * The failure this prevents is not a crash. It is a Dashboard that keeps
 * working and quietly shows an account balance "as of" a past window, or an
 * IOU position mixing a historical amount_owed against today's amount_settled
 * — a number that describes no moment in time and still looks plausible.
 */
describe("the date range cannot become a global filter", () => {
  /**
   * Structural, not textual: if someone adds a period parameter to either of
   * these, the arity changes and this fails — whatever the call site looks
   * like. A position is computed from every transaction to date, full stop.
   */
  it("the balance query accepts no period argument at all", () => {
    expect(listAccountsWithBalances.length).toBe(0);
  });

  it("the IOU snapshot accepts no period argument at all", () => {
    // Scoping amount_owed − amount_settled to a past window needs an entirely
    // new temporal IOU model, explicitly not introduced in M8 (audit Q1).
    expect(getIouSnapshot.length).toBe(0);
  });

  /** Every JSX tag on the page that is handed a `from` or `to` prop. */
  const rangeReceivers = [...source.matchAll(/<([A-Z][A-Za-z]*)([^>]*)/g)]
    .filter(([, , props]) => /\s(from|to)=\{/.test(props))
    .map(([, tag]) => tag);

  it("finds the range being passed somewhere (guards against checking nothing)", () => {
    expect(rangeReceivers.length).toBeGreaterThan(0);
  });

  /**
   * The whole rule in one assertion. The picker needs the range to show what
   * is selected; the period block needs it because it is the one block the
   * range scopes. Nothing else on the page may receive it — not the account
   * ledger, not the IOU snapshot, not recurring, not the activity feed.
   */
  it("passes the range only to the picker and the period block", () => {
    expect([...new Set(rangeReceivers)].sort()).toEqual(["DateRangeControl", "PeriodBlock"]);
  });

  it("never hands a range to a position, a today-relative figure or the feed", () => {
    for (const tag of ["AccountRow", "IouSnapshot", "RecurringSection", "RecentTransactions"]) {
      expect(rangeReceivers, `${tag} must not be range-scoped`).not.toContain(tag);
    }
  });
});
