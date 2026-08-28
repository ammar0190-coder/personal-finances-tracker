import { Decimal } from "decimal.js";
import type { IouEntry, IouEntryStatus, LedgerTransaction } from "./types";

export interface IouEntrySettlement {
  amountSettled: Decimal;
  status: IouEntryStatus;
}

/**
 * `amount_settled` / `status` for one IOU entry, recomputed (never
 * hand-incremented) from every linked `iou_repayment`/`iou_settlement`
 * transaction. PRD §10.8. Safe to call after any create/edit/delete of a
 * linked transaction — there's no running counter to drift out of sync.
 *
 * `written_off` is sticky: it wins over the arithmetic status UNLESS a
 * repayment now exists, in which case it's treated the same as any other
 * pending/partial/settled entry. The caller still owns clearing the
 * `writtenOff` flag on the stored row when that happens (§10.8) — this
 * function only decides what `status` *should* read, given the flag as
 * currently stored.
 */
export function computeIouEntrySettlement(
  entry: IouEntry,
  linkedTransactions: readonly LedgerTransaction[],
): IouEntrySettlement {
  let amountSettled = new Decimal(0);
  for (const txn of linkedTransactions) {
    if (txn.relatedIouEntryId !== entry.id) continue;
    if (txn.type !== "iou_repayment" && txn.type !== "iou_settlement") continue;
    amountSettled = amountSettled.plus(txn.amount);
  }

  if (entry.writtenOff && amountSettled.isZero()) {
    return { amountSettled, status: "written_off" };
  }

  const amountOwed = new Decimal(entry.amountOwed);
  const status: IouEntryStatus = amountSettled.isZero()
    ? "pending"
    : amountSettled.greaterThanOrEqualTo(amountOwed)
      ? "settled"
      : "partial";

  return { amountSettled, status };
}
