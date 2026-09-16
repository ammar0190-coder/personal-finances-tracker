# Repository Layout

Where every file lives, current and planned. Companion to `docs/MASTER_PLAN.md`.

## Current tree

```
personal-finances-tracker/
├── CLAUDE.md
├── README.md
├── AGENTS.md                          # Next.js 16 agent rules, re-added by `next dev` — imported
│                                       #   from CLAUDE.md via "@AGENTS.md". See its own header.
├── .gitignore
├── .env.example                       # placeholders only
├── .env.local                         # gitignored. Held local creds at D-6; as of 2026-09-16 it
│                                       #   points at the HOSTED project (see D-15, HANDOFF_USER)
├── .claude/
│   ├── settings.json                 # tracked: permissions + hooks + plugins
│   ├── settings.local.json           # gitignored: personal overrides
│   ├── skills/
│   │   ├── start-session/SKILL.md
│   │   ├── close-session/SKILL.md
│   │   └── ledger-check/SKILL.md
│   └── hooks/
│       ├── guard_paths.sh            # blocks Write/Edit to .env*/backups
│       ├── guard_paths_bash.sh       # same, for Bash — see D-6
│       ├── scan_secrets.sh           # blocks writing anything credential-shaped
│       └── guard_git.sh              # blocks commit/push/merge
├── docs/
│   ├── PRD.md                        # the spec — owns product behaviour
│   ├── MASTER_PLAN.md                # this project's build order + status
│   ├── DECISIONS.md                  # append-only decision log (D-1..D-15 so far)
│   ├── REPO_LAYOUT.md                # this file
│   ├── HANDOFF_NEXT_SESSION.md       # rewritten every close-session
│   └── HANDOFF_USER.md               # what Ammar owes, checked by start-session
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260828120000_initial_schema.sql            # full PRD §11 schema + §13 RLS
│   │   ├── 20260829030000_recurring_investment_support.sql  # SIPs need instrument_id, D-9
│   │   └── 20260916120000_backfill_missing_user_profiles.sql # profile rows for pre-schema sign-ins, D-12
│   └── tests/
│       └── backfill_user_profiles.test.sql   # pgTAP; run via `npm run test:db` (psql, supabase_admin)
├── scripts/
│   ├── generate-icons.mjs            # PWA icons (D-11)
│   ├── test-db.sh                    # runs supabase/tests/*.test.sql against local Postgres
│   └── deploy-wizard.sh              # interactive walkthrough of the M7 deploy steps (untracked
│                                      #   until Ammar decides to keep it)
├── tests/
│   └── e2e/                          # Playwright, `npm run test:e2e` — LOCAL Supabase only (D-15)
│       ├── global-setup.ts           # refuses non-local Supabase, checks it's running
│       ├── walkthrough.spec.ts       # new-user flow through every page + safety tests
│       └── support/                  # local-supabase.ts (guard, users, cookies), fixtures.ts
├── playwright.config.ts              # own dev server on :3100, NEXT_DIST_DIR=.next-e2e
├── src/
│   ├── proxy.ts                      # Next 16's renamed middleware — session refresh + auth gate
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── __tests__/                # theme-fonts: every --font-* token resolves to a next/font
│   │   ├── page.tsx                  # Dashboard (and onboarding, inline, when accounts = 0)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── callback/route.ts     # OAuth code exchange
│   │   │   └── error/page.tsx
│   │   ├── investments/page.tsx      # §6 — deliberately its own page, off the main Dashboard
│   │   ├── iou/page.tsx              # §7 — Receivables/Payables/Reimbursements tabs
│   │   └── reports/page.tsx          # §9
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Base UI underneath, not Radix)
│   │   ├── auth/                     # login-form, logout-button
│   │   ├── onboarding/               # add-account-form, seed-categories-button
│   │   ├── transactions/             # add/edit forms, category-select (grouped, §4), actions
│   │   ├── accounts/, categories/    # deactivate buttons (soft-delete, §3/§4)
│   │   ├── recurring/                # add form, due-now confirm card, list section
│   │   ├── investments/              # add-instrument, log-contribution, holdings-list (filters)
│   │   ├── iou/                      # group-expense, payable, entry row (repay/settle/write-off)
│   │   ├── reports/                  # category-breakdown-chart, trend-chart (Recharts)
│   │   ├── dashboard/                # masked-balance, burn-down, iou-snapshot, reconcile-dialog
│   │   └── __tests__/                # SSR dropdown-label tests; source scans for <Select> and ₹
│   ├── lib/
│   │   ├── ledger/                   # PURE money-math — no Supabase import anywhere in here
│   │   │   ├── types.ts, balance.ts (§10.1), spend.ts (§10.3), available.ts (§10.4)
│   │   │   ├── savings.ts (§10.5), iou.ts (§10.8), recurring.ts (§10.11), cycle.ts (§10.11)
│   │   │   ├── category-spend.ts (§9), money.ts (the numeric<->JS float boundary, D-7)
│   │   │   ├── format.ts             # formatMoney — the only way an amount is displayed (D-13)
│   │   │   └── __tests__/            # unit tests, no DB needed
│   │   ├── supabase/                 # client.ts, server.ts, proxy.ts
│   │   ├── select-options.ts         # { value, label } lists for every dropdown (D-14)
│   │   ├── __tests__/                # select-options unit tests
│   │   ├── charts/colors.ts          # dataviz-skill-validated categorical/sequential colors
│   │   ├── data/                     # read-only Supabase queries, mapped into ledger/ shapes
│   │   │   └── __tests__/            # 7 live integration test files, real Postgres required
│   │   └── actions/                  # "use server" mutations (create/edit/delete/confirm/etc.)
│   └── types/
│       └── database.ts               # generated via `supabase gen types typescript --local`
├── package.json
├── tsconfig.json
└── vitest.config.mts
```

**All of PRD §2-§13 is built** (M0-M6, `docs/MASTER_PLAN.md`). Only M7 (Deploy) remains, blocked
on Ammar's own setup (`docs/HANDOFF_USER.md`).

## What each doc is for

| File | Written | Owner | Never |
|---|---|---|---|
| `PRD.md` | now, amended when a design decision changes it | both | Silently edited — a change to product behaviour owes a `DECISIONS.md` entry. |
| `MASTER_PLAN.md` | now, updated as milestones complete | Claude Code | Reordered without saying why — if a milestone's dependency changes, say so in the "Status" line. |
| `DECISIONS.md` | continuously | both | Edited — entries are appended only. |
| `HANDOFF_NEXT_SESSION.md` | every session, by `close-session` | Claude Code | Appended to — rewritten each time. |
| `HANDOFF_USER.md` | when it drifts, by `close-session` | Claude Code | Touched when nothing actually changed — update only on real drift. |

## What must never be in this repository

| Never | Where it goes instead |
|---|---|
| Live Supabase keys, the Google OAuth client secret, any DB connection string with credentials | Password manager, plus `.env` locally, plus `.env.example` with fake values |
| Real account balances, transaction data, or anything from the live database | Nowhere — this is a schema/code repo, not a data export |
