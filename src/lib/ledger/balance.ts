import { Decimal } from "decimal.js";
import type { LedgerAccount, LedgerTransaction } from "./types";

/**
 * Account balance, computed live from the transaction log — never stored or
 * incrementally maintained. PRD §10.1. This is a pure function precisely so
 * that editing or deleting a transaction can never leave a balance stale:
 * there is no cached number to forget to invalidate.
 */
export function computeAccountBalance(
  account: LedgerAccount,
  transactions: readonly LedgerTransaction[],
): Decimal {
  const isCard = account.accountType === "credit_card";
  let total = new Decimal(0);

  for (const txn of transactions) {
    const amount = new Decimal(txn.amount);
    const isSource = txn.accountId === account.id;
    const isDestination = txn.toAccountId === account.id;
    if (!isSource && !isDestination) continue;

    if (isDestination) {
      // Only `transfer` ever sets to_account_id (PRD §11). Crediting a bank
      // account increases its balance; crediting a credit card reduces what
      // it owes (§10.1, §10.6).
      total = isCard ? total.minus(amount) : total.plus(amount);
      continue;
    }

    // isSource === true from here down.
    switch (txn.type) {
      case "income":
      case "iou_repayment":
      case "refund":
        // Credits: increase a bank balance, reduce a card's owed amount.
        total = isCard ? total.minus(amount) : total.plus(amount);
        break;
      case "expense":
      case "investment":
      case "iou_settlement":
        // Debits: decrease a bank balance, increase a card's owed amount.
        total = isCard ? total.plus(amount) : total.minus(amount);
        break;
      case "transfer":
        if (isCard) {
          // §10.2's table defines no formula for a credit card as a
          // transfer *source* — the product never offers this flow (a card
          // is only ever a transfer destination, i.e. a bill payment).
          // Fail loudly rather than compute an unspecified number.
          throw new Error(
            `computeAccountBalance: credit card account ${account.id} used as a transfer source ` +
              `(transaction ${txn.id}) — the PRD defines no balance effect for this. ` +
              "This should have been prevented before it reached the ledger.",
          );
        }
        total = total.minus(amount);
        break;
      default: {
        const exhaustive: never = txn.type;
        throw new Error(`computeAccountBalance: unhandled transaction type ${exhaustive as string}`);
      }
    }
  }

  return total;
}
