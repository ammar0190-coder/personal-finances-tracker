import { describe, expect, it } from "vitest";
import { Constants } from "@/types/database";
import type { Category } from "@/lib/data/categories";
import {
  ACCOUNT_TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  categoryOptions,
  recurringKindOptions,
  toOptions,
} from "@/lib/select-options";

const values = (options: ReadonlyArray<{ value: string }>) => options.map((o) => o.value);
const labels = (options: ReadonlyArray<{ label: string }>) => options.map((o) => o.label);

function category(overrides: Partial<Category> & Pick<Category, "id" | "name" | "kind">): Category {
  return { parent_id: null, active: true, user_id: "u1", default_account_id: null, created_at: "", ...overrides } as Category;
}

describe("fixed-value dropdown options", () => {
  // The stored value is what reaches the database, so it must stay a valid enum
  // member; only the label is for people.
  it("transaction type: values are DB transaction types, labels are capitalised", () => {
    expect(values(TRANSACTION_TYPE_OPTIONS)).toEqual(["expense", "income", "transfer"]);
    for (const v of values(TRANSACTION_TYPE_OPTIONS)) expect(Constants.public.Enums.transaction_type).toContain(v);
    expect(labels(TRANSACTION_TYPE_OPTIONS)).toEqual(["Expense", "Income", "Transfer (e.g. funding your budget)"]);
  });

  it("account type: values match the account_type enum exactly", () => {
    expect(values(ACCOUNT_TYPE_OPTIONS)).toEqual([...Constants.public.Enums.account_type]);
    expect(labels(ACCOUNT_TYPE_OPTIONS)).toEqual(["Bank", "Credit card"]);
  });

  it("instrument vehicle type: values match the instrument_vehicle_type enum exactly", () => {
    expect(values(VEHICLE_TYPE_OPTIONS)).toEqual([...Constants.public.Enums.instrument_vehicle_type]);
    expect(labels(VEHICLE_TYPE_OPTIONS)).toEqual(["Equity", "Mutual Fund", "PPF"]);
  });

  it("recurring frequency: values match the recurring_frequency enum exactly", () => {
    expect(values(FREQUENCY_OPTIONS)).toEqual([...Constants.public.Enums.recurring_frequency]);
    expect(labels(FREQUENCY_OPTIONS)).toEqual(["Monthly", "Quarterly", "Annual", "Custom interval"]);
  });

  it("recurring kind: SIP only offered when an instrument exists", () => {
    expect(values(recurringKindOptions(false))).toEqual(["expense", "income"]);
    expect(values(recurringKindOptions(true))).toEqual([...Constants.public.Enums.recurring_kind]);
    expect(labels(recurringKindOptions(true))).toEqual([
      "Recurring expense",
      "Recurring income (e.g. Salary)",
      "SIP (recurring investment)",
    ]);
  });
});

describe("toOptions", () => {
  it("uses the row id as the value and the chosen field as the label", () => {
    const rows = [
      { id: "8f0c-uuid-1", name: "HDFC" },
      { id: "8f0c-uuid-2", name: "Amex" },
    ];
    expect(toOptions(rows, (r) => r.name)).toEqual([
      { value: "8f0c-uuid-1", label: "HDFC" },
      { value: "8f0c-uuid-2", label: "Amex" },
    ]);
  });
});

describe("categoryOptions", () => {
  const categories: Category[] = [
    category({ id: "food", name: "Food", kind: "expense" }),
    category({ id: "swiggy", name: "Swiggy/Zomato", kind: "expense", parent_id: "food" }),
    category({ id: "travel", name: "Travel", kind: "expense" }),
    category({ id: "salary", name: "Salary", kind: "income" }),
  ];

  it("groups subcategories under their parent, with the parent itself as a blended choice", () => {
    expect(categoryOptions(categories, "expense")).toEqual([
      {
        key: "food",
        label: "Food",
        items: [
          { value: "food", label: "Food (blended)" },
          { value: "swiggy", label: "Swiggy/Zomato" },
        ],
      },
      { key: "travel", label: "Travel", items: [{ value: "travel", label: "Travel (blended)" }] },
    ]);
  });

  it("only includes categories of the requested kind", () => {
    expect(categoryOptions(categories, "income")).toEqual([
      { key: "salary", label: "Salary", items: [{ value: "salary", label: "Salary (blended)" }] },
    ]);
  });
});
