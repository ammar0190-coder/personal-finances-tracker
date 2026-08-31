import type { LedgerTransaction } from "./types";

/**
 * The start of the current budget cycle: the date of the most recent
 * transfer into the designated spend account. PRD §3 ("a transfer into the
 * user's designated spend account acts as that period's self-imposed spend
 * ceiling") and §10.11 ("budget cycles run from one spend-account transfer
 * to the next"). Each transfer-in demarcates a new cycle boundary — this is
 * an assumption beyond what the PRD states outright; see docs/DECISIONS.md
 * D-8 for the reasoning and the alternative considered.
 *
 * Returns `null` when no such transfer has ever happened — there is no
 * current cycle yet, and §10.4's available-to-spend has nothing to compute
 * against.
 */
export function findCurrentCycleStart(
  transactions: readonly LedgerTransaction[],
  spendAccountId: string,
): string | null {
  let latest: string | null = null;
  for (const txn of transactions) {
    if (txn.type !== "transfer" || txn.toAccountId !== spendAccountId) continue;
    if (!latest || txn.date > latest) latest = txn.date;
  }
  return latest;
}
