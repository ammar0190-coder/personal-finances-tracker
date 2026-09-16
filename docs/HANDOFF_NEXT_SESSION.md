# Handoff — for the next Claude Code session

Rewritten **2026-09-16**, at the close of a session that ran from 2026-09-14 to 2026-09-16. If
anything here disagrees with what you observe, trust the repo and fix this file.

**Open with `start-session`. Close with `close-session`.**

## 0. Before anything else

- **Read `docs/HANDOFF_USER.md`.** Two items there matter before building: the local env file
  now points at the **hosted** project, and Ammar has to review and commit this session's work.
- **The next milestone is M8, a visual design pass** (`docs/MASTER_PLAN.md`). It starts with
  `superpowers:brainstorming` and the `design` skill, **not code**: the PRD has no visual spec,
  and Ammar called the current look "AI slop". Ask about his taste and references first.

## 1. Repo state, exactly

```
Branch main. HEAD 883ad02, which Ammar has pushed; origin/main matched it as of 2026-09-16.
NOTHING from this session is committed. Ammar asked to review first.
Working tree: 32 modified tracked files + 16 new files (see §3). `git status` shows them all.
Local Supabase (Docker) was left running. `npx supabase stop` if you want it down.
No dev servers of ours are running. PID 1274 (next-server v16.2.11) belongs to a different
project; leave it alone.
Build and test outputs on disk, all gitignored: .next-e2e/, playwright-report/, test-results/.
```

## 2. Environment gotchas (these cost real time this session)

- **Node isn't on PATH in Claude's non-interactive shell.** Node comes from fnm, which
  `~/.bashrc` only loads for interactive shells. Prefix commands with
  `export PATH=/home/ammar/.local/share/fnm/node-versions/v24.18.0/installation/bin:$PATH`.
  Ammar's own terminal is fine.
- **Ammar's home network blocks outbound TCP 5432/6543**, confirmed against portquiz.net. Anything
  that connects to the hosted database directly (`supabase db push`, `migration list --linked`)
  times out there, and the CLI's `SUPABASE_DB_PASSWORD` hint is misleading. On a phone hotspot
  it works.
- **The hosted Supabase project auto-pauses** on the free tier. `supabase projects list` shows
  `INACTIVE`.
- **Hooks that fired this session, as designed:**
  - `guard_git.sh` blocks any Bash command whose *text* contains `git push`, including a heredoc
    that is only writing a script.
  - `guard_paths_bash.sh` blocks any Bash command whose text mentions the local env file, even
    in a doc heredoc. Use Edit/Write for doc text that names it.
- **The auto-mode classifier** blocked two things: piping `yes` into `supabase db push` (a blind
  apply) and reading production rows with the service key. Ammar ran the push himself. Don't try
  to work around either.
- **The WSL2 clock steps** (`hv_utils.timesync_implicit=1`). One integration run failed with
  `PGRST303: JWT issued at future`, and every run since passed. It's environmental; deliberately
  not "fixed". If it recurs often, add a bounded sign-in retry in the test helper, written
  test-first.
- **`supabase test db` hung**, and it runs as `postgres`, which can't disable triggers on
  `auth.users`. Use `npm run test:db` instead (psql as `supabase_admin`, D-12).

## 3. What this session did

**Deploy (M7):**
- Verified the pipeline and corrected three stale docs.
- Wrote `scripts/deploy-wizard.sh`, 7 stages, now with a port-5432 reachability check.
- Ammar ran it: restored the project, pushed the schema over a hotspot, set up Vercel and the
  OAuth URLs.
- The site is live at `https://personal-finances-tracker-px1n.vercel.app`, and **real Google
  sign-in worked**.

**Live bug: every write failed for Ammar.** He had signed in before the schema existed, so
`public.users` had no row for him. Fixed with migration `20260916120000` plus a pgTAP test (D-12);
Ammar pushed it to hosted, and `migration list --linked` shows all 3 migrations on the remote.

**Polish, all test-first, requested by Ammar after seeing the live site:**
1. **Dropdown labels.** All 17 `<Select>`s now pass `items` from `src/lib/select-options.ts`.
   Stored values are unchanged, which the tests verify. Also fixed: dropdowns went blank when their
   options appeared after the form mounted (D-14).
2. **Font.** In `globals.css`, `--font-sans: var(--font-sans)` referenced itself, so the whole
   app rendered in a serif fallback. It now points at `var(--font-geist-sans)`.
3. **Money.** `formatMoney` (`src/lib/ledger/format.ts`) replaces 22 hand-built `₹` displays,
   using Indian grouping (D-13; **Ammar hasn't explicitly confirmed Indian vs Western**).

**Permanent Playwright E2E** (`npm run test:e2e`, D-15). Ammar approved the dependency;
`@playwright/test` is pinned at 1.63.0. It runs against local Supabase only, with layered guards.
The walkthrough covers onboarding, categories, account, income, expense, the DB values, masked and
revealed balance, reload, investments, IOU, reports drill-down, sign-out, and sign-in again.
Ammar ran `sudo … playwright install-deps chromium`, so Chromium launches here now.

**Docs updated:** MASTER_PLAN (M7 status, a post-MVP polish entry, new M8 with observed design
problems), DECISIONS D-12–D-15 (all `DRAFT`), REPO_LAYOUT, HANDOFF_USER, this file.

### Files changed (uncommitted)

**Modified:**
- **Config:** `.gitignore`, `eslint.config.mjs`, `next.config.ts` (`distDir` from
  `NEXT_DIST_DIR`), `package.json` (`test:db`, `test:e2e`, `@playwright/test`),
  `package-lock.json`, `tsconfig.json` (two `.next-e2e` type paths, which Next adds itself),
  `vitest.config.mts` (excludes `tests/e2e`)
- **Docs:** `docs/HANDOFF_NEXT_SESSION.md`, `docs/HANDOFF_USER.md`, `docs/MASTER_PLAN.md`,
  `docs/DECISIONS.md`, `docs/REPO_LAYOUT.md`
- **Pages:** `src/app/globals.css`, `src/app/page.tsx`, `src/app/iou/page.tsx`,
  `src/app/reports/page.tsx`
- **Components:** `src/components/`
  - `dashboard/`: burn-down, iou-snapshot, masked-balance, reconcile-dialog
  - `investments/`: add-instrument-form, holdings-list, log-investment-form
  - `iou/`: flag-reimbursement-form, group-expense-form, iou-entry-row
  - `onboarding/`: add-account-form
  - `recurring/`: add-recurring-form, recurring-section
  - `reports/`: category-breakdown-chart, trend-chart
  - `transactions/`: add-transaction-form, category-select, edit-transaction-dialog

**New:**
- **Formatter and options:** `src/lib/ledger/format.ts`, `src/lib/select-options.ts`
- **Unit tests:** `src/lib/ledger/__tests__/format.test.ts`,
  `src/lib/__tests__/select-options.test.ts`, `src/components/__tests__/select-labels.test.tsx`,
  `src/components/__tests__/money-display.test.ts`, `src/app/__tests__/theme-fonts.test.ts`
- **Database:** `supabase/migrations/20260916120000_backfill_missing_user_profiles.sql`,
  `supabase/tests/backfill_user_profiles.test.sql`
- **Scripts:** `scripts/test-db.sh`, `scripts/deploy-wizard.sh`
- **E2E:** `playwright.config.ts`, `tests/e2e/global-setup.ts`,
  `tests/e2e/support/local-supabase.ts`, `tests/e2e/support/fixtures.ts`,
  `tests/e2e/walkthrough.spec.ts`

## 4. Pipeline at close (fresh run, 2026-09-16)

| Command | Result |
|---|---|
| `npm test` | 115 passed, 31 skipped (the integration files, run below) |
| `npm run test:integration` | **Intermittent.** In the close-out run, 2 of 9 files failed (27 passed, 4 skipped); the log was overwritten before it was read. The next 6 runs in a row passed 31/31. See §5. |
| `npm run test:db` | 8/8 ok |
| `npm run test:e2e` | 6 passed (one is an intentional `test.fail()` proving the login-redirect guard) |
| `npm run lint` / `npx tsc --noEmit` / `npm run build` | clean |
| `.claude/hooks/scan_secrets.sh` | clean |

## 5. Live loose ends

- **The integration suite is flaky and the cause is unproven.** It failed twice this session, and
  never twice in a row:
  - 2026-09-14: `PGRST303: JWT issued at future`, traced to WSL2 clock steps (§2).
  - 2026-09-16 close-out: 2 files failed with their tests skipped, which is the shape of a failure
    during a file's setup (the test sign-in happens there). The error text was lost.

  The code under test didn't change between the passing and failing runs. **Next time it fails,
  keep the log** (`npm run test:integration 2>&1 | tee /tmp/int.log`) before rerunning. If it's
  PGRST303 again, add a bounded sign-in retry to the test helper, written test-first.

- **Not yet confirmed on the live site:** Ammar re-trying "Load starter categories" after the
  backfill (it works locally and in E2E), and "Add to Home Screen" on a phone.
- **The live site still runs the old UI code.** The dropdown, font and money fixes reach Vercel
  only when Ammar commits and pushes them.
- **Raw stored values still shown** where there's no dropdown: account type under account names
  ("bank") and IOU status badges ("pending"). Folded into M8.
- **Carried over, still open:**
  - reimbursement flagging is a follow-up action, not a checkbox at logging time (PRD §12
    wording);
  - `getCurrentBudgetCycle` assumes a single `is_spend_account`;
  - no dark-mode toggle exists, so the dark tokens are unreachable.
- **`holdings-list.tsx`** keeps its own `VEHICLE_LABELS` map, which duplicates
  `VEHICLE_TYPE_OPTIONS`. Harmless; unify during M8 if it's touched.
- **`scripts/deploy-wizard.sh`:** Ammar's call whether to commit it or delete it now that the
  deploy is done.
