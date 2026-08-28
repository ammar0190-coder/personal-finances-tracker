---
name: ledger-check
description: Audit the current diff for anything that could corrupt a balance,
  spend total, or IOU settlement figure. Run before committing any change that
  touches account balances, transaction effects, or IOU/reimbursement settlement.
---

Review the current diff against these specific hazards, from PRD §10, and report each as PASS,
FAIL, or N/A with a file and line reference:

1. **Balances stay computed, never stored/incrementally maintained.** No new column caching an
   account balance, period spend, available-to-spend, or savings rate outside of an explicit,
   flagged performance decision (§10.1, §10.3–§10.5).
2. **`IOU_Entries.amount_settled`/`status` are recomputed from linked transactions, never
   hand-incremented or hand-set**, except the manual `written_off` override (§10.8, §12).
3. **Every transaction type's effect matches the §10.2 table exactly** — which account
   debits/credits, whether it counts as period spend. A `transfer` or `investment` must never
   count as spend; an `iou_settlement` always must.
4. **Credit card accounts use the inverted balance formula** (§10.1) — spending increases owed, a
   transfer into the card reduces owed. A bug here reads as a bank account and silently inverts
   every credit-card figure.
5. **Editing or deleting a transaction never leaves an orphaned reference** — a delete on a
   transaction with a dependent `Group_Expenses`, `refunded_transaction_id`, or
   `reimbursed_transaction_id` row must be blocked, not silently cascaded or ignored (§12).
6. **No silent fallback on a money calculation** — no bare except returning a default balance, no
   rounding that isn't explicit, no float where the schema says decimal (§11).
7. **Money amounts are decimals end to end** — from the database type through any serialization
   layer to the UI. A float anywhere in the path is a bug, not a style preference (§11). In this
   codebase specifically: any value read from Supabase must go through `toMoneyString()`
   (`src/lib/ledger/money.ts`) before it touches arithmetic — a raw `t.amount` from a query result
   used directly in a `+`/`-`/comparison is the failure mode this exists to catch (§10.1, D-7).

Report only. Do not fix anything unless asked.
