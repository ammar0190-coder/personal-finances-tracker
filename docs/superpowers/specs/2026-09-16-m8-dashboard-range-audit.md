# M8 — Dashboard date-range audit

Required by the gate in `2026-09-16-m8-visual-design-design.md` §3.3: **no implementation
decision about the date-range control, and no code, until every figure and control on the
Dashboard is classified and that classification is approved.**

Audited 2026-09-16 by reading `src/app/page.tsx` and the data functions it calls. Nothing here is
built yet.

## Classification

Five kinds, not the three the spec anticipated. The extra two matter.

| Kind | Meaning |
|---|---|
| **Position** | True as of now. Never range-scoped. |
| **Range** | Recomputes for the selected window. |
| **Cycle** | Scoped to the current budget cycle, whose bounds come from the transfer log — not from the picker. |
| **Today** | Relative to the current date. Never range-scoped. |
| **Feed** | A fixed count of latest rows. Not a window at all. |

| # | Element | Source | Kind | Notes |
|---|---|---|---|---|
| 1 | Account balance, per account | `listAccountsWithBalances()` | **Position** | Every transaction to date. Range-scoping this is the error the spec exists to prevent. |
| 2 | Privacy mask / reveal | client state | — | Not a figure |
| 3 | Reconcile: transactions since last snapshot | `getTransactionsSinceLastSnapshot(accountId)` | **Position** | Anchored to the last balance snapshot, an account-specific boundary. Never a user range. |
| 4 | Burn-down: cycle start | `findCurrentCycleStart` | **Cycle** | Derived from spend-account transfers (D-8) |
| 5 | Burn-down: budget ceiling | transfers in, `cycleStart..today` | **Cycle** | |
| 6 | Burn-down: misc income kept in spend account | income, `cycleStart..today` | **Cycle** | |
| 7 | Burn-down: spent so far | `computePeriodSpend(cycleStart, today)` | **Cycle** | The one figure that becomes Range when the selected window is not a cycle — see Q3 |
| 8 | Burn-down: earmarked, unconfirmed | `next_due_date <= today` | **Today** | |
| 9 | Burn-down: available to spend | derived from 5–8 | **Cycle** | |
| 10 | IOU: net receivable / net payable | `getIouSnapshot()` | **Position** | See Q1 — this is the significant finding |
| 11 | Recurring: due now | `listDueRecurringTemplates(today)` | **Today** | |
| 12 | Category list | `listCategories()` | — | Not a figure |
| 13 | Recent transactions | `listTransactions({ limit: 15 })` | **Feed** | See Q2 |

## Three questions the PRD does not settle

### Q1 — The IOU block is a position, but §8 describes a flow

`getIouSnapshot()` sums `amount_owed − amount_settled` across entries whose status is `pending` or
`partial`, **with no date filter at all**. That is an outstanding position, structurally the same
kind of number as an account balance.

But PRD §8's range sentence lists "IOU activity within range" among what recalculates. Those are
two different figures:

- **Position** — what you are owed right now. Meaningless to scope to a past window: it would mix
  a historical `amount_owed` with today's `amount_settled` and produce a number that describes no
  moment in time.
- **Activity** — entries created and repayments received inside the window. A genuine flow, and
  genuinely range-scoped.

The Dashboard currently shows the position. §8's "IOU snapshot — net Receivable and net Payable
totals" also describes a position. The range sentence is the only place "activity" appears.

**Recommended:** the Dashboard IOU block stays a **position** and does not move with the range.
If IOU activity-in-a-window is wanted, it belongs in Reports (§9) alongside the other flows.
Quietly range-scoping the existing snapshot would produce a wrong number that still looks
plausible, which is the worst failure available here.

### Q2 — Recent activity is a feed, not a window

PRD §8: "Recent transactions — **a short feed of the latest log entries**." Latest, unqualified.
The current code takes `limit: 15` with no date bound.

The design spec's §3.1 table marks this block range-scoped. **That was my assumption, not the
PRD's**, and this audit is where it gets corrected rather than implemented.

**Recommended:** keep it a **feed**. "Latest 15" stays useful whatever window is selected, and a
range-scoped feed is either redundant with Reports or empty for a window with little activity.

### Q3 — What "raw totals" means when the range is not a cycle

PRD §8: "If the range aligns with an actual budget/transfer cycle, it renders as a proper
burn-down against that ceiling; otherwise it shows **raw totals**."

"Raw totals" is not defined anywhere. The available-to-spend formula (§10.4) cannot apply, since
without a cycle there is no ceiling to subtract from.

**Recommended:** for a non-cycle range, the block shows **spend and income for the window** and
nothing else — no ceiling, no earmarking, no available-to-spend, and no progress bar, because a
progress bar with no denominator is a lie. The block changes shape rather than showing the same
shape with degraded numbers.

Also relevant: `getCurrentBudgetCycle` matches a **single** `is_spend_account`
(`accounts.find(a => a.is_spend_account)`). That limitation is known, is recorded in the handoff,
and is **out of scope here** — but the range work must not silently change its behaviour either.

## What follows from this

If the recommendations hold, the control scopes **one** figure today: spend-so-far, and only when
the selected range is not the current cycle. Everything else on the Dashboard is a position, a
cycle figure, a today-relative figure, or a feed.

That is a much smaller change than "the whole view recalculates" implies, and it is worth saying
plainly: most of the Dashboard is *not* period data. The PRD sentence is written for the Reports
side of the same engine, where spend by category, income, net savings and IOU activity all are
flows.

## Answers — approved 2026-09-16

All three recommendations accepted.

- **Q1 — the IOU block stays a position.** Unaffected by the range. Range-scoping
  `amount_owed − amount_settled` would require an entirely new temporal IOU model, and that
  complexity is not being introduced in M8. IOU activity-in-a-window belongs in Reports if it is
  ever wanted.
- **Q2 — Recent activity stays a feed of the latest 15.** "Latest" is the operative word in §8. A
  date picker must not silently turn a recent-activity feed into a period query.
- **Q3 — the cycle block changes shape for a non-cycle range.** Two genuinely different
  components, not one component with degraded numbers:

  | Range **is** the budget cycle | Range is **not** a cycle |
  |---|---|
  | Budget ceiling | — |
  | Spent so far | Spend |
  | Earmarked, unconfirmed | — |
  | Available to spend | Income |
  | Progress bar | no progress bar |

  Blank fields were rejected for inviting a reading of "data missing"; hiding the block was
  rejected for throwing away exactly the period information the picker exists to expose.

### The conceptual model

The model this produces, in the user's own words, and the thing to read first before touching the
Dashboard:

> - **Accounts** — where I stand now
> - **IOUs** — where I stand now
> - **Recent activity** — what happened most recently
> - **Selected period** — what happened during this window
> - **Cycle** — what I can spend against right now

One date picker ambiguously governing an entire Dashboard is what this replaces.

**The gate is now cleared.** Implementation of the date-range control may proceed on these terms
and no others.
