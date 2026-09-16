/**
 * Every database enum a user can see has a human-readable label, and the label
 * set covers every value the database can actually produce.
 *
 * The M8 defect this guards: the UI showed raw stored values — "bank" under an
 * account name, "pending" on an IOU badge — because those surfaces are not
 * dropdowns, so nothing forced a label to exist. Checking against the generated
 * enum means adding a value to the schema fails here until it has a label.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_TYPE_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
  IOU_STATUS_OPTIONS,
  TRANSACTION_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
  labelFor,
} from "@/lib/select-options";

const types = readFileSync(path.resolve(import.meta.dirname, "../../types/database.ts"), "utf8");

/** The values the generated `Constants` block says the database enum holds. */
function dbEnum(name: string): string[] {
  const m = types.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`));
  if (!m) throw new Error(`no database enum named ${name}`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const userFacing = [
  ["account_type", ACCOUNT_TYPE_OPTIONS],
  ["iou_status", IOU_STATUS_OPTIONS],
  ["instrument_vehicle_type", VEHICLE_TYPE_OPTIONS],
  ["recurring_frequency", FREQUENCY_OPTIONS],
  ["transaction_type", TRANSACTION_TYPE_LABELS],
] as const;

describe("enum labels", () => {
  it("reads the generated enums (guards against the test silently checking nothing)", () => {
    expect(dbEnum("iou_status")).toEqual(["pending", "partial", "settled", "written_off"]);
  });

  it.each(userFacing)("%s has a label for every value the database can hold", (name, options) => {
    expect(options.map((o) => o.value).sort()).toEqual(dbEnum(name).sort());
  });

  /**
   * The transaction-type DROPDOWN is deliberately a subset: only expense,
   * income and transfer are chosen by a person. Investment, refund and the two
   * IOU types are created by their own flows. They still need display labels —
   * recent activity renders a transaction's type whenever it has no category,
   * which is exactly when those four show up.
   */
  it("offers only the three user-choosable transaction types in a dropdown", () => {
    expect(TRANSACTION_TYPE_OPTIONS.map((o) => o.value)).toEqual(["expense", "income", "transfer"]);
  });

  it("still labels the four types a person never picks", () => {
    for (const value of ["investment", "refund", "iou_repayment", "iou_settlement"]) {
      expect(labelFor(TRANSACTION_TYPE_LABELS, value)).not.toBe(value);
    }
  });

  it.each(userFacing)("%s never shows a raw value as its own label", (_name, options) => {
    for (const { value, label } of options) {
      expect(label).not.toBe(value);
      expect(label).not.toMatch(/_/);
    }
  });

  describe("labelFor", () => {
    it("turns a stored value into its label", () => {
      expect(labelFor(ACCOUNT_TYPE_OPTIONS, "credit_card")).toBe("Credit card");
      expect(labelFor(IOU_STATUS_OPTIONS, "written_off")).toBe("Written off");
    });

    it("falls back to the raw value rather than rendering nothing", () => {
      // A blank cell hides a problem; the raw value at least shows what happened.
      expect(labelFor(ACCOUNT_TYPE_OPTIONS, "something_new")).toBe("something_new");
    });
  });
});
