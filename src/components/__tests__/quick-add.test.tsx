/**
 * PRD §8's quick-add: "log an expense directly from the dashboard, without
 * navigating into the Expense Log page first".
 *
 * Before M8 the full transaction form sat inline on the dashboard, which is the
 * opposite of a shortcut. It now opens on demand, and the form is not in the
 * document until it does.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/lib/data/accounts";
import type { Category } from "@/lib/data/categories";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
vi.mock("@/lib/actions/transactions", () => ({ createTransaction: async () => {} }));

const { QuickAdd } = await import("@/components/transactions/quick-add");

const accounts = [{ id: "a1", name: "HDFC" }] as unknown as Account[];
const categories = [
  { id: "c1", name: "Food", kind: "expense", parent_id: null },
  { id: "c2", name: "Salary", kind: "income", parent_id: null },
] as unknown as Category[];

const html = () => renderToStaticMarkup(<QuickAdd accounts={accounts} categories={categories} />);

describe("quick add", () => {
  it("offers logging an expense as the prominent action", () => {
    expect(html()).toContain("Add expense");
  });

  it("keeps the other transaction types behind a secondary control", () => {
    // Expense is the common case; income and transfer should not compete with it.
    expect(html()).toMatch(/aria-label="[^"]*transaction types?[^"]*"/i);
  });

  it("does not put the transaction form on the page until asked", () => {
    // The whole point of §8's shortcut: the dashboard is not a form.
    expect(html()).not.toContain('aria-label="Log a transaction"');
  });
});
