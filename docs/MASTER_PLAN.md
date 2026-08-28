# Master Plan — Personal Finance Tracker

Plan of record for build order. Companion to `docs/PRD.md`, which owns *what* to build; this file
owns *in what order*. Read `docs/PRD.md` first — this file assumes it.

Each milestone below is scoped to a PRD section or cluster of sections. None of these are detailed
chunk cards yet — when a session starts a milestone with no clear implementation plan, route
through `superpowers:writing-plans` first, per `CLAUDE.md`.

## Status

**M0 done and verified. M1 partially done** (core logging works end-to-end against real Supabase;
edit/delete UI and account/category deactivation UI are not built yet — the server actions exist,
the UI to call them doesn't). Next: finish M1's remaining UI, then M2.

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

### M1 — Accounts, Categories, core ledger — **in progress**

Done: onboarding (starter category template seed, add-account form), Expense/Income logging,
Dashboard showing real computed balances (privacy-mode masking with per-account reveal), recent
transactions list. Server actions for edit/delete/deactivate already exist
(`src/lib/actions/transactions.ts`, `accounts.ts`) including the dependent-row delete-blocking
rule from §12 — not yet wired to any UI.

**Exit test — partially passed.** `src/lib/data/__tests__/end-to-end.integration.test.ts` logs a
realistic month (salary income, two expenses on different account types, a credit-card bill
payment) through real Supabase and asserts the resulting balances match PRD §10.1's formula
exactly (bank: 73349.5, card: 0 owed) — passing. Editing/deleting a transaction through the UI
and confirming the balance updates with no stale state is NOT yet verified, because that UI
doesn't exist yet.

**Still open for M1:** edit/delete transaction UI, account/category deactivate UI, subcategory
support in the add-transaction form (currently only top-level categories are selectable),
end-of-day batch logging (§4).

### M2 — Recurring templates

Recurring Fixed Expenses and Recurring Income/Salary (§5), confirm-before-posting, earmarking on
available-to-spend (§10.4). Exit test: a template due today surfaces for confirmation, posting it
with an edited amount creates the right transaction, and `next_due_date` advances correctly
across a month-end edge case (§10.11).

### M3 — Investments & Savings

Investment Holdings (Equity/MF/PPF) and Savings accounts as two visually separate sections (§6),
SIP as a recurring template variant. Exit test: an investment contribution never counts as spend,
a savings transfer shows correctly in the savings-rate calculation (§10.5) including the
gross-not-net-of-withdrawal behaviour, and a savings-to-savings transfer is excluded from "raw
savings tracked."

### M4 — IOU & Reimbursements

Group Expense flow, Receivables, Payables, Reimbursements (§7), the write-off mechanism, and the
`amount_settled`/`status` recompute-on-write rule (§10.8). Exit test: a group expense with a
custom split that doesn't sum to the total still posts correctly (the gap is the user's own
share); editing a linked repayment transaction updates the IOU entry's settled amount without
manual intervention; a written-off entry drops out of the Dashboard's net totals.

### M5 — Dashboard

Account balances (masked by default), spend burn-down, IOU snapshot, recent transactions,
quick-add, reconcile-now (§8, §10.10). Exit test: privacy mode masks every balance by default,
per-account reveal works, and a reconciliation with a >₹500 delta triggers the manual audit path
rather than an automatic correcting entry.

### M6 — Reports

Category breakdown, subcategory drill-down, trend over time, savings rate (§9). Exit test: a past
period's "effective spend" visibly shrinks after a refund is logged against an expense from that
period, dated after the fact (§10.3).

### M7 — Deploy

Vercel deployment, PWA/service worker for "add to home screen" (§14). Exit test: the app installs
to a phone home screen and the burn-down renders correctly on a real device, not just the dev
server.

## What's deliberately not here

Everything in PRD §15, Phase 2 — none of it is scheduled. A milestone that starts pulling in a
Phase 2 item is scope creep; say so and stop.
