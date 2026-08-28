// Domain types mirroring the schema in docs/PRD.md §11.
// Money fields use `string` (a decimal literal, e.g. "1234.50") at this
// boundary rather than `number`, so a float never enters the ledger math.
// See docs/PRD.md §11 ("all monetary fields are decimals, never floats")
// and .claude/skills/ledger-check/SKILL.md item 7.

export type AccountType = "bank" | "credit_card";

export interface LedgerAccount {
  id: string;
  accountType: AccountType;
  isSpendAccount: boolean;
  isSavings: boolean;
}

export type TransactionType =
  | "expense"
  | "transfer"
  | "investment"
  | "income"
  | "iou_repayment"
  | "iou_settlement"
  | "refund";

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  accountId: string;
  /** Set only for `transfer`. PRD §11. */
  toAccountId: string | null;
  amount: string;
  /** ISO calendar date, YYYY-MM-DD. PRD §10.11. */
  date: string;
  /**
   * For `iou_repayment` / `refund`: the transaction this one is linked back
   * to, when linked. Used by spend calculation (§10.3) to attribute the
   * repayment/refund to the *original* transaction's period, not its own.
   * Caller-resolved (a join through IOU_Entries for a repayment, or the
   * direct `refunded_transaction_id` for a refund) — see spend.ts.
   */
  linkedTransactionId: string | null;
  /**
   * For `iou_repayment` / `iou_settlement`: the IOU_Entries row this
   * transaction settles against. PRD §11's `related_iou_entry_id`. Used by
   * the amount_settled/status recompute (§10.8), a different relation from
   * `linkedTransactionId` above even though both often trace back to the
   * same original expense.
   */
  relatedIouEntryId: string | null;
}

export type IouEntryStatus = "pending" | "partial" | "settled" | "written_off";

export interface IouEntry {
  id: string;
  amountOwed: string;
  /**
   * Manual, sticky override — set only by the user's explicit "write off"
   * action (§7). Never touched by the recompute in iou.ts; the caller is
   * responsible for keeping this flag itself, and for clearing it when a
   * new repayment is logged against a written-off entry (§10.8).
   */
  writtenOff: boolean;
}
