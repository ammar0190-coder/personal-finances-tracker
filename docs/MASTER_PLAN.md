# Master Plan — Personal Finance Tracker

Plan of record for build order. Companion to `docs/PRD.md`, which owns *what* to build; this file
owns *in what order*. Read `docs/PRD.md` first — this file assumes it.

Each milestone below is scoped to a PRD section or cluster of sections. None of these are detailed
chunk cards yet — when a session starts a milestone with no clear implementation plan, route
through `superpowers:writing-plans` first, per `CLAUDE.md`.

## Status

**M0 through M6 are done and verified**, live, against real Supabase (not mocked) — every PRD
MVP feature (§2-§13) is now built and covered by an automated test that actually runs against
Postgres. **M7 (Deploy) is the only thing left, and it's entirely blocked on Ammar** — see that
milestone's own note and `docs/HANDOFF_USER.md`.

The core money-math library (`src/lib/ledger/`) is complete for everything specified in PRD §10 —
balance, spend, available-to-spend, savings tracking, IOU settlement recompute, recurring
next-due-date advancement — with 50 passing unit tests and no dependency on Supabase at all (it's
pure functions over plain data). Five real gaps/ambiguities found while implementing it are
recorded in `docs/DECISIONS.md` D-1 through D-5, each with a test locking in the choice made.

### M0 — Project scaffold — **DONE**

Built: Next.js 16 (App Router, Turbopack, TypeScript, Tailwind v4, shadcn/ui), the full PRD §11
schema as a migration with every RLS policy from §13, Google OAuth wiring via Supabase Auth
(`src/lib/supabase/`, `src/proxy.ts`, `src/app/auth/*`), local Supabase (`supabase start`, Docker)
for dev/test.

**Exit test — passed, live, twice:**
- `npm run test:rls` (`src/lib/supabase/__tests__/rls.integration.test.ts`): two real users
  against real Postgres — one cannot see, insert-as, update, or delete the other's rows. 7/7
  passing.
- An unauthenticated request to `/` gets a real 307 redirect to `/auth/login`, which renders the
  actual "Continue with Google" login page — verified via curl against a running dev server, not
  just "should work."

**Not verified live:** the actual Google OAuth round-trip end to end (no real Google OAuth client
exists yet — that's `docs/HANDOFF_USER.md` item 2) and a real browser session driving the UI (no
browser-automation tool available in that session; curl-level HTTP checks and the data-layer
integration test cover what's checkable without one).

### M1 — Accounts, Categories, core ledger — **DONE**

Built: onboarding (starter category template seed, add-account form), Expense/Income logging
with subcategory selection (§4's blended-vs-detailed choice, one grouped picker), end-of-day
batch logging (add several lines, save together), edit/delete transaction UI, account/category
deactivate UI, Dashboard showing real computed balances (privacy-mode masking with per-account
reveal), recent transactions list.

**Exit test — passed, live.**
- `end-to-end.integration.test.ts`: a realistic month (salary income, two expenses on different
  account types, a credit-card bill payment) through real Supabase produces exactly the balance
  PRD §10.1 predicts (bank: 73349.5, card: 0 owed).
- `edit-delete.integration.test.ts` (added finishing M1): editing a transaction's amount and
  deleting a transaction both recompute the balance correctly with no stale state; the database's
  own foreign-key constraints back up §12's delete-blocking rule for real (deleting a transaction
  a refund is linked to raises a real Postgres constraint violation); deleting a Group Expense's
  anchor transaction cascades to remove its `Group_Expenses` row and `IOU_Entries` together, per
  §12's "Delete Group Expense" flow — verified even though the IOU module's own UI doesn't exist
  yet (M4), because the schema-level cascade behavior needed locking in now while the reasoning
  was fresh.

`npm run test:integration` runs all three live-Supabase test files together (12 tests, all
passing) — `npm test` alone only runs the 50 DB-free unit tests, since integration tests need
`npx supabase start` (Docker) first.

### M2 — Recurring templates — **DONE**

Built: create a recurring template (any of the four frequencies, including `custom` with its
D-4 interval field), a "Due now" confirm-before-posting flow with an editable amount, transfers
(added to the transaction form — needed to actually fund a spend account and start a cycle), and
a Dashboard burn-down card showing the real budget cycle (ceiling, spend so far, earmarked
upcoming bills, available to spend).

**Exit test — passed, live.** `recurring.integration.test.ts`: confirming a template due
2026-01-31 (monthly) posts a transaction with the user-edited amount and advances
`next_due_date` to 2026-02-28 — the month-end clamp from §10.11, exercised for real, not just
unit-tested in isolation. The confirmed posting counts as real spend in its own period. A
transfer into the spend account is shown to start a new cycle (`findCurrentCycleStart`), and a
due-but-unconfirmed template correctly earmarks against that cycle's available-to-spend.

Two real ambiguities in the PRD's §10.11/§5 text — what happens with more than one top-up
transfer, and exactly which unconfirmed templates count as "upcoming" — were resolved and
recorded as `docs/DECISIONS.md` D-8.

### M3 — Investments & Savings — **DONE**

Built: a dedicated `/investments` page (kept off the main Dashboard on purpose, per §6) with
Investment Holdings (tick-box filters by vehicle type, combining into any subset) and Savings
Accounts as two visually separate sections; add-instrument and log-contribution forms; SIPs as a
true recurring-template variant (schema didn't originally support this — see `docs/DECISIONS.md`
D-9 — now it does, confirm-before-posting and all).

**Exit test — passed, live**, `investments.integration.test.ts`: an investment contribution
debits the account but contributes exactly 0 to period spend; a savings-to-savings transfer is
excluded from raw savings tracked while a real deposit counts in full; a SIP recurring template
posts a real `investment` transaction with `instrument_id`/`quantity` correctly set (a bug in the
first version of `confirmRecurringPosting` — it forgot these fields for the investment case,
which would have failed a real database constraint — was caught here before ever running against
real usage).

### M4 — IOU & Reimbursements — **DONE**

Built: a dedicated `/iou` page (Receivables / Payables / Reimbursements as tabs, per §7's "kept
as a fully separate module"), the Group Expense flow (equal-split helper + free-form custom
amounts, no sum-to-total validation per the PRD-review decision), Payable creation, recording a
repayment/settlement against any entry, the write-off action, and flagging an existing expense as
reimbursable. The Dashboard gained an IOU snapshot (net receivable/payable, written-off excluded,
hidden entirely when both are zero).

**Exit test — passed, live**, `iou.integration.test.ts` (6 tests): a custom split that sums to
less than the total posts fine, the gap being the user's own share; a repayment reduces the group
expense's effective spend in its own period, and *editing* that repayment's amount afterward
updates the entry's settled amount with no manual step; a written-off Payable drops out of net
totals and a later settlement against it reverses that; a Payable's creation touches neither
balance nor spend while settling it counts as real spend; a reimbursement received reduces the
original expense's effective spend and is never counted as fresh income; deleting a Group
Expense that already has a repayment logged against it requires deleting the repayment first — a
naive delete of just the anchor transaction was confirmed to fail with a real foreign-key
violation (`docs/DECISIONS.md` D-10), which is exactly why `deleteGroupExpense` does it in that
order rather than relying on the database to sort it out.

Not built in this pass: the checkbox-at-logging-time flow for flagging a reimbursement (PRD §12
says "while logging any Expense" — built instead as a follow-up action from a list of recent
expenses, functionally equivalent but not the same UI moment); "saved friend groups" for
participant name autocomplete is explicitly Phase 2 (§15.4) and wasn't attempted.

### M5 — Dashboard

Account balances (masked by default), spend burn-down, IOU snapshot, recent transactions,
quick-add, reconcile-now (§8, §10.10). Exit test: privacy mode masks every balance by default,
per-account reveal works, and a reconciliation with a >₹500 delta triggers the manual audit path
rather than an automatic correcting entry.

### M6 — Reports — **DONE**

Built: a `/reports` page — category breakdown (sorted bar chart, click a bar to drill into
subcategories), a weekly/monthly/all-time toggle (real URL params, not just client state), a
12-month spend trend line, and savings rate for the selected period. Charts went through the
`dataviz` skill: category bars use its validated 6-hue categorical order (shadcn's own default
`--chart-1..5` tokens are a grayscale ramp — fine for a sequential scale, unusable for categorical
identity, so they were replaced in `globals.css`), the trend line uses the single sequential blue
since one series needs no legend.

**Exit test — passed, live**, `reports.integration.test.ts`: a January category total drops from
2000 to 1500 after a refund dated in February is logged against the January expense — checked by
re-running the same report query, not by asserting on a cached number.

### M7 — Deploy — **blocked on Ammar, not started**

Vercel deployment, PWA/service worker for "add to home screen" (§14). Needs a real GitHub repo
(pushed), a real Supabase project (not local Docker), a real Google OAuth client, and a Vercel
account connected to that repo — none of which Claude Code can create. See
`docs/HANDOFF_USER.md`. Once those exist, this is mostly configuration (env vars in Vercel,
`next-pwa`/Workbox setup) rather than new application code — everything M0-M6 built is
platform-agnostic already.

## What's deliberately not here

Everything in PRD §15, Phase 2 — none of it is scheduled. A milestone that starts pulling in a
Phase 2 item is scope creep; say so and stop.
