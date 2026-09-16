/**
 * Every dropdown must show a human-readable label in its closed trigger, never
 * the stored value (an enum like "bank" or a row UUID), while still submitting
 * the stored value unchanged.
 *
 * Rendered server-side with react-dom/server: Base UI renders the selected
 * label into [data-slot="select-value"] and the raw value into a hidden input,
 * so both halves are checkable without a DOM library.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";
import type { Instrument } from "@/lib/data/instruments";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
vi.mock("@/lib/actions/accounts", () => ({}));
vi.mock("@/lib/actions/transactions", () => ({}));
vi.mock("@/lib/actions/instruments", () => ({}));
vi.mock("@/lib/actions/group-expenses", () => ({}));
vi.mock("@/lib/actions/recurring", () => ({}));
vi.mock("@/lib/actions/iou", () => ({}));

const { AddAccountForm } = await import("@/components/onboarding/add-account-form");
const { AddTransactionForm } = await import("@/components/transactions/add-transaction-form");
const { CategorySelect } = await import("@/components/transactions/category-select");
const { LogInvestmentForm } = await import("@/components/investments/log-investment-form");
const { AddInstrumentForm } = await import("@/components/investments/add-instrument-form");
const { GroupExpenseForm } = await import("@/components/iou/group-expense-form");
const { AddRecurringForm } = await import("@/components/recurring/add-recurring-form");

const HDFC_ID = "407bf0fd-d4d7-4c3d-a1f0-9767052a71fd";
const FOOD_ID = "0d1e2f30-0000-4000-8000-000000000001";
const SWIGGY_ID = "0d1e2f30-0000-4000-8000-000000000002";
const LEISURE_ID = "0d1e2f30-0000-4000-8000-000000000003";
const FUND_ID = "0d1e2f30-0000-4000-8000-000000000004";

const accounts = [{ id: HDFC_ID, name: "HDFC", account_type: "bank", active: true } as Account];
const categories = [
  { id: FOOD_ID, name: "Food", kind: "expense", parent_id: null, active: true },
  { id: SWIGGY_ID, name: "Swiggy/Zomato", kind: "expense", parent_id: FOOD_ID, active: true },
] as Category[];
const leisure = [{ id: LEISURE_ID, name: "Leisure", kind: "expense", parent_id: null, active: true } as Category];
const instruments = [{ id: FUND_ID, name: "Parag Parikh Flexi Cap", vehicle_type: "mutual_fund" } as Instrument];

/** Text shown in each closed dropdown, in document order. */
function triggerTexts(element: ReactElement): string[] {
  const html = renderToStaticMarkup(element);
  return [...html.matchAll(/<span[^>]*data-slot="select-value"[^>]*>(.*?)<\/span>/g)].map((m) => m[1]);
}

/** Values the dropdowns would submit, in document order. */
function submittedValues(element: ReactElement): string[] {
  const html = renderToStaticMarkup(element);
  return [...html.matchAll(/<input id="[^"]*-hidden-input"[^>]*value="([^"]*)"/g)].map((m) => m[1]);
}

describe("closed dropdowns show labels, submit stored values", () => {
  it("add account: account type", () => {
    const el = <AddAccountForm />;
    expect(triggerTexts(el)).toEqual(["Bank"]);
    expect(submittedValues(el)).toEqual(["bank"]);
  });

  it("log a transaction: type and account", () => {
    const el = <AddTransactionForm accounts={accounts} categories={categories} />;
    const texts = triggerTexts(el);
    expect(texts.slice(0, 2)).toEqual(["Expense", "HDFC"]);
    expect(texts.join(" ")).not.toContain(HDFC_ID);
    expect(submittedValues(el).slice(0, 2)).toEqual(["expense", HDFC_ID]);
  });

  it("category picker: subcategory and blended parent", () => {
    expect(triggerTexts(<CategorySelect categories={categories} kind="expense" value={SWIGGY_ID} onChange={() => {}} />)).toEqual([
      "Swiggy/Zomato",
    ]);
    const parent = <CategorySelect categories={categories} kind="expense" value={FOOD_ID} onChange={() => {}} />;
    expect(triggerTexts(parent)).toEqual(["Food (blended)"]);
    expect(submittedValues(parent)).toEqual([FOOD_ID]);
  });

  it("log investment: instrument and account", () => {
    const el = <LogInvestmentForm accounts={accounts} instruments={instruments} />;
    expect(triggerTexts(el)).toEqual(["Parag Parikh Flexi Cap", "HDFC"]);
    expect(submittedValues(el)).toEqual([FUND_ID, HDFC_ID]);
  });

  it("dropdowns with nothing selected show a prompt, not a blank box", () => {
    // The category picker only appears once a Leisure category exists.
    expect(triggerTexts(<GroupExpenseForm accounts={[]} leisureCategories={[]} />)).toEqual(["Choose an account"]);
  });

  it("add instrument: vehicle type", () => {
    const el = <AddInstrumentForm />;
    expect(triggerTexts(el)).toEqual(["Mutual Fund"]);
    expect(submittedValues(el)).toEqual(["mutual_fund"]);
  });

  it("group expense: account and category", () => {
    const el = <GroupExpenseForm accounts={accounts} leisureCategories={leisure} />;
    expect(triggerTexts(el)).toEqual(["HDFC", "Leisure"]);
    expect(submittedValues(el)).toEqual([HDFC_ID, LEISURE_ID]);
  });

  it("recurring item: kind, account and frequency", () => {
    const el = <AddRecurringForm accounts={accounts} categories={categories} instruments={instruments} />;
    const texts = triggerTexts(el);
    expect(texts).toContain("Recurring expense");
    expect(texts).toContain("HDFC");
    expect(texts).toContain("Monthly");
    for (const text of texts) {
      expect(["expense", "income", "investment", "monthly", "quarterly", "annual", "custom"]).not.toContain(text);
      expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    }
    expect(submittedValues(el)).toEqual(expect.arrayContaining(["expense", HDFC_ID, "monthly"]));
  });
});

describe("every Select in the app declares its labels", () => {
  // Some dropdowns only render after a click (IOU repayment, edit dialog), so a
  // render test can't reach them. Base UI shows the raw value unless `items`
  // is passed to the root, so require it on every <Select> opening tag.
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return name === "__tests__" ? [] : sourceFiles(full);
      return full.endsWith(".tsx") ? [full] : [];
    });
  }

  const root = path.resolve(import.meta.dirname, "../..");
  const offenders = sourceFiles(root)
    .filter((f) => !f.endsWith(path.join("components", "ui", "select.tsx")))
    .flatMap((file) => {
      const src = readFileSync(file, "utf8");
      return [...src.matchAll(/<Select\s[\s\S]*?>[ \t]*\n/g)]
        .filter((m) => !/\bitems=/.test(m[0]))
        .map((m) => `${path.relative(root, file)}: ${m[0]}`);
    });

  it("no <Select> is missing an items prop", () => {
    expect(offenders).toEqual([]);
  });
});
