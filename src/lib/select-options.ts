import type { Category } from "@/lib/data/categories";
import type { Database } from "@/types/database";

/**
 * Dropdown options as `{ value, label }` pairs. Each <Select> passes its list
 * to the root's `items` prop (so the closed trigger shows the label, not the
 * stored value) and renders its <SelectItem>s from the same list, so the two
 * can't drift apart. `value` is exactly what gets stored; `label` is display
 * only.
 */
export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

// A type alias rather than an interface: Base UI's group type has an index signature.
export type SelectOptionGroup = {
  key: string;
  label: string;
  items: SelectOption[];
};

type Enums = Database["public"]["Enums"];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer (e.g. funding your budget)" },
] as const satisfies ReadonlyArray<SelectOption<Enums["transaction_type"]>>;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit card" },
] as const satisfies ReadonlyArray<SelectOption<Enums["account_type"]>>;

export const VEHICLE_TYPE_OPTIONS = [
  { value: "equity", label: "Equity" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "ppf", label: "PPF" },
] as const satisfies ReadonlyArray<SelectOption<Enums["instrument_vehicle_type"]>>;

export const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom interval" },
] as const satisfies ReadonlyArray<SelectOption<Enums["recurring_frequency"]>>;

/** SIPs need an instrument to point at, so that choice only appears once one exists. */
export function recurringKindOptions(hasInstruments: boolean): SelectOption<Enums["recurring_kind"]>[] {
  const options: SelectOption<Enums["recurring_kind"]>[] = [
    { value: "expense", label: "Recurring expense" },
    { value: "income", label: "Recurring income (e.g. Salary)" },
  ];
  if (hasInstruments) options.push({ value: "investment", label: "SIP (recurring investment)" });
  return options;
}

/** Options for rows picked by id: accounts, instruments, transactions. */
export function toOptions<T extends { id: string }>(rows: readonly T[], label: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: row.id, label: label(row) }));
}

/**
 * PRD §4: either a top-level category (a blended entry) or one of its
 * subcategories is a valid choice, so each parent group offers the parent
 * itself first, then its children.
 */
export function categoryOptions(categories: readonly Category[], kind: "expense" | "income"): SelectOptionGroup[] {
  const relevant = categories.filter((c) => c.kind === kind);
  return relevant
    .filter((c) => !c.parent_id)
    .map((parent) => ({
      key: parent.id,
      label: parent.name,
      items: [
        { value: parent.id, label: `${parent.name} (blended)` },
        ...relevant.filter((c) => c.parent_id === parent.id).map((c) => ({ value: c.id, label: c.name })),
      ],
    }));
}
