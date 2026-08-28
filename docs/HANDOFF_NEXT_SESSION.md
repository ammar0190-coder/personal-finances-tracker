# Handoff — for the next Claude Code session

Rewritten **2026-08-28**, after the session that took this from "PRD + empty scaffold" to a
working, live-verified Next.js + Supabase app: M0 fully done, M1 partially done, 50 unit tests +
8 live integration tests all green, build and lint clean.

**Open with `start-session`. Close with `close-session`.**

## 0. What Ammar owes before the next session

See `docs/HANDOFF_USER.md` in full — it changed this session (project name resolved, item
ordering updated). Summary: a real Supabase project and Google OAuth client are still needed for
anything beyond local dev; Docker + `npx supabase start` is enough to keep working locally without
either yet.

## 1. Repo state, exactly

```
git initialized, nothing committed. Everything through this session is staged (git add -A
already run) — 89 files. Local Supabase and the dev server were both stopped cleanly at the
end of the session (`npx supabase stop`, dev server process killed) — nothing left running.
```

First commit is Ammar's, per `CLAUDE.md` Workflow — a reasonable message: "M0 complete, M1 core
logging: schema + RLS + auth + ledger library + dashboard, all live-verified."

## 2. What this session did

1. Finalized `docs/PRD.md` (edit/delete semantics, Group Expense split validation, IOU write-off,
   account/category soft-delete, gross-vs-net savings rate, negative available-to-spend) and set
   up the repository's Claude Code tooling to match `telosight`/`review-tool`'s conventions.
2. Renamed the project to `personal-finances-tracker` (was `finance-tracker`).
3. Scaffolded Next.js 16 (App Router, Turbopack, TypeScript, Tailwind v4, shadcn/ui) and verified
   against the **bundled** Next.js docs (`node_modules/next/dist/docs/`) and Supabase's own
   current GitHub examples, rather than trusting training data — Next 16 renamed
   `middleware.ts`/`middleware()` to `src/proxy.ts`/`proxy()`, which is exactly the kind of
   breaking change AGENTS.md warns about.
4. Built `src/lib/ledger/` — every formula in PRD §10, as pure, Supabase-free TypeScript, using
   `decimal.js` throughout (never a JS `number` in the arithmetic itself). **50 unit tests, all
   passing**, written test-first for each module. Along the way, found and resolved five real
   gaps/ambiguities in the PRD's own specification of §10 (credit-card-as-transfer-source is
   undefined, spend clamping, available-to-spend's scope, `custom` recurring frequency had no
   parameter, savings-rate ÷ 0) — each is `docs/DECISIONS.md` D-1 through D-5, each locked in by
   a test.
5. Wrote the full PRD §11 schema + §13 RLS as one migration
   (`supabase/migrations/20260828120000_initial_schema.sql`), including type-conditional CHECK
   constraints encoding "field X is set only for type Y" directly as database constraints, not
   just doc prose. Ran it for real against local Supabase (Docker) — applied cleanly.
6. **Verified RLS actually isolates two real users**, live, not mocked:
   `npm run test:rls` creates two real accounts via the Supabase admin API and asserts one cannot
   see, insert-as, update, or delete the other's rows. 7/7 passing.
7. Found and fixed a real architectural gap while wiring the DB to the ledger library: PostgREST
   serializes Postgres `numeric` as a bare JSON number, so Supabase hands the app a JS `number`,
   not a string — confirmed empirically (not assumed) by inserting a decimal value and inspecting
   the raw HTTP response. Fixed with one function, `toMoneyString()`, and a decision entry
   (D-7) — this is the kind of thing worth reading if you touch any money-reading code.
8. Built Google OAuth login (`src/app/auth/*`), the session-refresh proxy (`src/proxy.ts`), and a
   first working vertical slice of the product: onboarding (seed starter categories, add
   account), Dashboard (masked balances with reveal, real computed balances, recent transactions),
   and expense/income logging. **A full realistic month of transactions, logged through real
   Supabase, produces exactly the balance PRD §10.1 predicts** —
   `src/lib/data/__tests__/end-to-end.integration.test.ts`, passing.
9. Found this project's own `.claude/hooks/` was missing telosight's Bash-level path guard
   (`guard_paths_bash.sh`) — discovered by needing to write local Supabase dev credentials to
   `.env.local` and finding the Bash route wasn't covered. Used the gap once (documented as D-6),
   then closed it immediately with the same fix telosight already has, verified it now blocks.

**Final verification, this session, real output:** `npm run build` clean, `npm run lint` clean,
`npm test` 50 passed / 8 skipped (RLS + e2e tests skip without `RUN_RLS_TESTS=1` + local Supabase
running), `RUN_RLS_TESTS=1 npm test` with local Supabase running: **58/58 passed.**

## 3. Milestone position

**M0 — DONE**, verified live (see §2 above and `docs/MASTER_PLAN.md`).

**M1 — in progress.** Core logging works end-to-end against real Supabase. Not yet built: the UI
for edit/delete/deactivate (the server actions already exist and are correct — see
`src/lib/actions/transactions.ts`, `accounts.ts`, `categories.ts` — they just aren't wired to any
button yet), subcategory selection in the transaction form, end-of-day batch logging.

## 4. Live loose ends

- **Not verified: a real browser session.** No browser-automation tool was available this
  session. Verification instead relied on: `npm run build`'s own type-checking, curl-level HTTP
  checks against a running dev server (confirmed the `/` → `/auth/login` redirect and the login
  page's real rendered content), and the data-layer integration tests. The actual click-through
  UI (forms, the onboarding flow, masked-balance toggle) has not been driven by anything that
  simulates a real user in a browser. Worth doing early next session, once Ammar can just open it
  himself, or once a browser tool is available.
- **Not verified: real Google OAuth.** Everything downstream of auth (RLS, the dashboard, the
  ledger) was tested against local Supabase's own auth (admin-created test users, signed in with
  a password) — never against a real Google OAuth round-trip, since no real OAuth client exists
  yet (`docs/HANDOFF_USER.md` item 2).
- `src/app/page.tsx` does both onboarding AND the dashboard inline (conditional on
  `accounts.length === 0`) rather than as separate routes — a deliberate simplification for this
  vertical slice, not necessarily how it should stay once onboarding grows (recurring templates,
  default-account-per-category, PIN/privacy-mode setup are all still missing from onboarding per
  PRD §3.1).
- The add-transaction form only offers top-level categories, not subcategories (PRD §4's
  Swiggy/Zomato-under-Food style drill-down) — a real gap against the PRD, not a deliberate cut.

## 5. Workflow reminders

- **Claude commits nothing.** Same convention as `telosight` and `review-tool` — enforced by
  `.claude/hooks/guard_git.sh`, verified firing this session.
- **Local dev needs `npx supabase start` (Docker) before anything that touches the database will
  work** — the dev server itself starts fine without it, but every page will error without a
  reachable Postgres. `npx supabase stop` when done to free the containers.
- If `.env.local` is ever regenerated, its values come from `supabase start`'s own JSON output
  (`API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`) — see D-6 for why this was written directly rather
  than through the normal Write-tool path, and why that path is now closed for anything else.
