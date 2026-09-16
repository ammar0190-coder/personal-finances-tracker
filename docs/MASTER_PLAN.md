# Master Plan — Personal Finance Tracker

Plan of record for build order. Companion to `docs/PRD.md`, which owns *what* to build; this file
owns *in what order*. Read `docs/PRD.md` first — this file assumes it.

Each milestone below is scoped to a PRD section or cluster of sections. None of these are detailed
chunk cards yet — when a session starts a milestone with no clear implementation plan, route
through `superpowers:writing-plans` first, per `CLAUDE.md`.

## Status

**M0 through M6 are done and verified**, live, against real Supabase (not mocked), and everything
they built is covered by an automated test that actually runs against Postgres.

**Three PRD MVP items were found unbuilt on 2026-09-16** while checking the code against the PRD.
Each had schema support but no UI, which is why they went unnoticed. All three were folded into
**M8c and are now resolved:**

| PRD | Item | State |
|---|---|---|
| §8 Controls | Custom date-range picker on the Dashboard | **Built** (M8c), on the terms of the approved audit and D-16: it scopes the period block and nothing else. |
| §2, §8 Settings | Privacy-mode configuration | **Built** (M8c). Account Settings now exists; the switch writes `users.privacy_mode_enabled`. |
| §2, §8 Settings | PIN quick-unlock | **Deliberately not built** (D-18). The row renders inert and a static assertion fails if anyone wires it to `pin_hash`. It is the one MVP item deferred, to its own security milestone. |

An earlier version of this file claimed every PRD MVP feature (§2–§13) was built; that was wrong,
and the claim was corrected rather than quietly dropped.

**M7 is effectively done:** the app is live at
`https://personal-finances-tracker-px1n.vercel.app`, and real Google sign-in and data entry work
there (2026-09-16). Its one open item is a phone "Add to Home Screen" check, which only Ammar can
do.

**M8a, M8b and M8c are all done** (2026-09-16): the app has a design system, an app shell, a
restructured Dashboard, quick-add, every module screen reskinned, and now Account Settings, a
dark/light theme toggle and the Dashboard date-range control. **M8 is complete**, which makes the
PRD's MVP complete apart from the PIN, deferred on purpose (D-18).

Pipeline as of 2026-09-16, all green: lint, `tsc` and build clean; 232 unit, 31 live integration
and 8 pgTAP database tests pass, plus a 12-test Playwright E2E suite against local Supabase
(`npm run test:e2e`, D-15). The secret scan is clean.

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

### M7 — Deploy — **DONE except the phone-install check**

Two separable halves, and only one of them ever needed Ammar.

**Done — the PWA (§14), commit `883ad02`.** `app/manifest.ts`, a hand-written service worker
(`public/sw.js`) with an explicit cache policy, an offline fallback page, generated icons
(192/512/maskable, via `scripts/generate-icons.mjs`), and client-side registration. Four unit
test files cover it: manifest shape, the SW cache policy, registration, and the proxy matcher
(`src/proxy.ts` had to stop intercepting the SW and manifest paths — that's the `src/proxy.ts`
change in the same commit). Decision recorded in `docs/DECISIONS.md`.

**Done 2026-09-16 — the deploy.** Ammar restored the auto-paused Supabase project, pushed the
schema (over a phone hotspot, because his home network blocks outbound Postgres ports), imported
the repo into Vercel with the three env vars, and pointed the Google OAuth redirect URLs at the new
domain. `./scripts/deploy-wizard.sh` walks all of these steps.

**Found and fixed on the live site:** the first Google sign-in happened before the schema existed,
so the account had no `public.users` row and every write failed. A backfill migration
(`20260916120000`, D-12) fixed it and was pushed to hosted.

**Exit test.** Real Google OAuth round-trip against the deployed site: **passed** (signed in,
onboarding rendered). **Not yet confirmed by Ammar:** that "Load starter categories" now works on
the live site after the backfill (it does locally and in E2E), and "Add to Home Screen" on a real
phone.

### Post-MVP polish (2026-09-16) — **DONE**

Not a PRD milestone; these are fixes for problems Ammar hit on the live site. All three were
written test-first:
- every dropdown shows a label, never a UUID or raw enum value (D-14);
- the self-referencing `--font-sans` token, which made the whole app render in a serif fallback,
  is fixed;
- one money formatter (`₹50,000.00`, Indian grouping) is used for every displayed amount (D-13).

The session also made the Playwright E2E suite permanent (D-15).

### M8 — Visual design pass — **DONE (M8a, M8b, M8c)**

Ammar's verdict on the live site: it "looks quite sloppy… AI slop". The PRD specifies only
"Tailwind CSS + shadcn/ui" (§14) and gives no visual direction, so **this milestone starts with
design decisions, not code**. Route through `superpowers:brainstorming`, then the `design` skill
(a mockup canvas Ammar can tweak by hand), before implementing anything.

Observed problems, from this session's screenshot review:
- **Hierarchy.** The dashboard is one long column of equal-weight cards: accounts, burn-down,
  recurring, a full transaction form, categories, recent transactions. PRD §8 ranks balances and
  burn-down first and the IOU snapshot lower; the layout doesn't reflect that.
- **Navigation.** Page links are small underlined text ("Investments →"). There is no app shell,
  no active state, and no mobile navigation, although the app is meant to run as an installed PWA
  on a phone (§14).
- **Forms dominate.** The full "Log a transaction" form sits inline on the dashboard. PRD §8 asks
  for a quick-add; a sheet or dialog would fit better.
- **Type and colour.** The default shadcn neutral grey everywhere, no brand colour, amounts in
  widely spaced Geist Mono. The negative/positive colouring of amounts needs a design decision.
- **Raw values still shown:** the account type under account names ("bank") and IOU status
  badges ("pending").
- **Small defects:** an empty header gap in the IOU summary card; greyed-out disabled buttons
  that look broken; bare "Nothing logged yet" empty states; dark-mode tokens exist but there's no
  toggle to reach them.
- **Onboarding** is one card with a bare button and a raw form.

Exit test: a design reviewed and approved by Ammar in the canvas; the implemented screens match
it at phone and desktop widths; E2E suite and screenshot review stay green.

**Design settled 2026-09-16**, spec at `docs/superpowers/specs/2026-09-16-m8-visual-design-design.md`,
canvas artboards in `design/m8/`. Instrument Serif for display headings with Geist everywhere
else; near-black ground with a restrained indigo accent; colour reserved for exceptions, giving
exactly three meanings; accounts as a ledger, not a card; charts analytical, not decorative.

#### M8a — design system, shell, Dashboard, quick-add — **DONE**

Tokens and typography (Instrument Serif via `next/font`, dark as the default theme, tabular
figures replacing the monospace amounts), the app shell (bottom bar on phones, sidebar on desktop,
active state carried by `aria-current` as well as colour), the Dashboard restructured to the
approved hierarchy with the burn-down as its only card, and quick-add replacing the inline
transaction form while keeping batch entry.

Before any of it, the Playwright walkthrough was made resilient — selectors moved from "the Nth
combobox inside the card titled X" to role, label and landmark — which was mostly a real
accessibility fix, since the select triggers had no accessible name at all.

#### M8b — module screens, onboarding, auth, defects — **DONE**

Investments, IOU, Reports, onboarding and auth on the new system, with no cards on module pages
(D-17). All six recorded defects cleared. Two bugs found that were not on the list: the chart
colour constants had drifted from the CSS so the trend line was still the blue M8a removed (D-19),
and `transaction_type` display labels were missing for the four types no one picks (D-20).

#### M8c — Settings, theme toggle, date-range control — **DONE**

**Account Settings** (`/settings`, reached from the header, never the tab bar): privacy mode as a
real `role="switch"` writing `users.privacy_mode_enabled`; the theme toggle; the per-user timezone
(§10.11); and the inert PIN row.

**The theme toggle** is hand-rolled — no `next-themes` — as the design spec §4.1 required: a
blocking init script so nothing flashes, `localStorage` persistence, and `useSyncExternalStore`
rather than an effect (D-21).

**The date-range control** is bound by D-16 and built to it: it scopes the period block and
nothing else. A non-cycle window changes the block's SHAPE — spend and income, no ceiling, no
earmarking, no available-to-spend — rather than degrading the burn-down's numbers. The rule is
enforced two ways: structurally, by asserting `listAccountsWithBalances` and `getIouSnapshot` take
no period argument, and at the page level, by asserting the range reaches exactly two components.

**The PIN stays inert** (D-18), and the static assertion that enforces it now exists. It scans
runtime source with comments stripped, and the stripper is itself tested against the inputs that
would silence it.

**Four defects found, three of them not on any list:**
- the timezone picker would have shown **every** user `Africa/Abidjan` as their zone (D-22);
- the light theme logged a hydration mismatch on every load (D-21);
- the app scrolled sideways at phone width — 457px in a 390px viewport — partly pre-existing,
  partly caused by the new settings gear (D-24);
- the IOU tab strip overflowed independently, also pre-existing (D-24).

Two of these were found by looking at rendered screenshots, not by the suite.

## What's deliberately not here

Everything in PRD §15, Phase 2 — none of it is scheduled. A milestone that starts pulling in a
Phase 2 item is scope creep; say so and stop.
