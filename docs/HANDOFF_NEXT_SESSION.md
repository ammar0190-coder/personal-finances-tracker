# Handoff — for the next Claude Code session

Rewritten **2026-08-29**, after the session that took this from "M0 + partial M1" to **the entire
MVP (M0-M6) built and live-verified against real Supabase.** Only M7 (Deploy) remains, and it's
entirely blocked on Ammar's own setup steps.

**Open with `start-session`. Close with `close-session`.**

## 0. What Ammar owes before the next session

See `docs/HANDOFF_USER.md` in full. Nothing has changed there this session except: local dev
(Docker + `npx supabase start`) is fully sufficient to keep building — a real Supabase project
and Google OAuth client are only needed for M7 (deploy) and for testing the real Google sign-in
round-trip, which has never been exercised (see §4 below).

## 1. Repo state, exactly

```
git initialized, nothing committed. All work through M6 is staged (git add -A run at the
end of this session). Local Supabase and the dev server were both stopped and confirmed
stopped (docker ps shows nothing, curl to :3000 refused) — nothing left running.
```

## 2. What this session did

Starting from "M0 done, M1 partially done" (previous session's handoff), built and
**live-verified against real Postgres** every remaining MVP milestone:

- **Finished M1**: edit/delete transaction UI, account/category deactivate UI, a grouped
  category picker (parent + subcategories in one select, PRD §4), end-of-day batch logging,
  transfers added to the logging form (needed to actually fund a budget cycle).
- **M2 — Recurring templates**: confirm-before-posting UI, a Dashboard burn-down card wired to
  real budget-cycle math (`src/lib/ledger/cycle.ts`, new this session).
- **M3 — Investments & Savings**: a dedicated `/investments` page; SIPs required extending the
  `recurring_templates` schema (it had no way to point at an Instrument — D-9) — a real bug in
  the first version of that fix (missing `instrument_id`/`quantity` on the posted transaction)
  was caught by the integration test before it could ever run against real usage.
- **M4 — IOU & Reimbursements**: a `/iou` page (Receivables/Payables/Reimbursements tabs), Group
  Expenses, write-offs, the `amount_settled` recompute retrofitted into `editTransaction`/
  `deleteTransaction` (it didn't exist until M4 needed it). Found and fixed a real schema
  interaction: deleting a Group Expense that already has a repayment logged against it FAILS at
  the database level unless the repayment is deleted first (D-10) — confirmed by writing a test
  that tries the naive order and asserts it fails, then the correct order and asserts it
  succeeds.
- **M5 — Dashboard**: the IOU snapshot, and reconciliation (§3/§10.10) — "reconcile now" per
  account, auto-correcting small deltas, showing the transaction log for the manual-audit path
  on a >₹500 delta.
- **M6 — Reports**: category breakdown with subcategory drill-down, a 12-month trend line,
  savings rate — using Recharts, run through the `dataviz` skill (shadcn's default `--chart-1..5`
  tokens turned out to be a grayscale ramp, unusable for categorical identity — replaced in
  `globals.css` with the skill's validated 6-hue categorical order).

**Every milestone's exit test is a real file that runs against real Postgres** —
`npm run test:integration` (7 files, ~40 tests) with `npx supabase start` running first. Full
suite: `npm test` — **87/87 passing** (50 pure unit tests + 37 live integration tests across 7
files), `npm run build` clean, `npm run lint` clean, all re-verified as the very last thing this
session did, after everything else, on the actual final code.

**Ten Decision Log entries now** (`docs/DECISIONS.md`, D-1 through D-10) — every real ambiguity
or gap found while implementing the PRD literally, each with a test that locks the choice in.
Worth reading before touching `src/lib/ledger/` or the schema.

**Attempted and explicitly abandoned:** real browser end-to-end testing via Playwright. It
installs and downloads Chromium fine with no sudo, but launching it fails —
`chrome-headless-shell: error while loading shared libraries: libasound.so.2` — and this
sandbox has no passwordless sudo to install the missing system library. Rather than ship an
unverified test file, the `playwright` devDependency was removed again. **If a future session
has sudo** (this machine, run by Ammar directly, almost certainly does), `npx playwright install
--with-deps chromium` should just work, and real browser tests are a natural next investment —
the pattern (create a user via the Supabase admin API, sign in, inject the resulting session as
a cookie into the Playwright browser context, navigate) is straightforward given everything
already built for the live integration tests.

## 3. Milestone position

**M0 through M6: DONE**, per `docs/MASTER_PLAN.md`'s own per-milestone notes (each has its exact
exit-test evidence).

**M7 — Deploy: blocked on Ammar**, not started. Needs: a real Supabase project, a real Google
OAuth client, a GitHub repo (pushed), a Vercel account. See `docs/HANDOFF_USER.md`. Once those
exist, M7 itself is mostly configuration, not new code — everything built so far is
platform-agnostic.

## 4. Live loose ends

- **Never verified: a real browser session, or real Google OAuth.** Every check this session was
  either `npm run build`'s type-checking, curl against a running dev server (confirms routing/
  auth-redirect/rendering at the HTTP level), or an integration test hitting real Postgres
  directly. No test has driven the actual UI by clicking things, and no test has gone through a
  real Google sign-in — local Supabase's own auth (admin-created test users, password sign-in)
  stood in for it everywhere. See §2's Playwright note above for the concrete next step.
- The reimbursement-flagging UI is a follow-up action from a list of recent expenses, not a
  checkbox at the moment of logging (PRD §12's literal wording) — functionally equivalent, not
  pixel-identical to the spec's described moment.
- `getCurrentBudgetCycle` (`src/lib/data/dashboard.ts`) assumes exactly one `is_spend_account`;
  if a user ever flags two accounts as the spend account, behavior is undefined (takes
  `accounts.find(...)`, the first match). The PRD's own language is ambiguous about whether more
  than one is even meant to be allowed — worth a `DECISIONS.md` entry if it ever comes up for
  real, not addressed here.
- No dark-mode toggle UI exists yet, so the dark-mode CSS variables added for Reports charts
  (`--chart-1..6` in `.dark`) are correct but currently unreachable in the running app.

## 5. Workflow reminders

- **Claude commits nothing.** Enforced by `.claude/hooks/guard_git.sh`, verified firing multiple
  times across both sessions.
- **`npx supabase start` (Docker) before anything touching the database** — dev server alone
  starts fine without it, every page will error without a reachable Postgres.
  `npx supabase stop` when done.
- `npm run test:integration` needs `RUN_RLS_TESTS=1` (the script sets it) AND local Supabase
  running — it's silently skipped (not failed) otherwise, by design, so a machine without Docker
  running still gets a clean `npm test`.
