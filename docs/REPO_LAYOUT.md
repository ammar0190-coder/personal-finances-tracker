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
├── .env.local                         # gitignored — local Supabase dev creds, see D-6
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
│   ├── DECISIONS.md                  # append-only decision log (D-1..D-7 so far)
│   ├── REPO_LAYOUT.md                # this file
│   ├── HANDOFF_NEXT_SESSION.md       # rewritten every close-session
│   └── HANDOFF_USER.md               # what Ammar owes, checked by start-session
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 20260828120000_initial_schema.sql   # full PRD §11 schema + §13 RLS
├── src/
│   ├── proxy.ts                      # Next 16's renamed middleware — session refresh + auth gate
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard (and onboarding, inline, when accounts = 0)
│   │   └── auth/
│   │       ├── login/page.tsx
│   │       ├── callback/route.ts     # OAuth code exchange
│   │       └── error/page.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── auth/                     # login-form, logout-button
│   │   ├── onboarding/               # add-account-form, seed-categories-button
│   │   ├── transactions/             # add-transaction-form
│   │   └── dashboard/                # masked-balance
│   ├── lib/
│   │   ├── ledger/                   # PURE money-math — no Supabase import anywhere in here
│   │   │   ├── types.ts
│   │   │   ├── balance.ts            # §10.1
│   │   │   ├── spend.ts              # §10.3
│   │   │   ├── available.ts          # §10.4
│   │   │   ├── savings.ts            # §10.5
│   │   │   ├── iou.ts                # §10.8
│   │   │   ├── recurring.ts          # §10.11 next_due_date
│   │   │   ├── money.ts              # the numeric<->JS float boundary, D-7
│   │   │   └── __tests__/            # 50 unit tests, no DB needed
│   │   ├── supabase/                 # client.ts, server.ts, proxy.ts + rls.integration.test.ts
│   │   ├── data/                     # read-only Supabase queries, mapped into ledger/ shapes
│   │   └── actions/                  # "use server" mutations (create/edit/delete)
│   └── types/
│       └── database.ts               # generated via `supabase gen types typescript --local`
├── package.json
├── tsconfig.json
└── vitest.config.mts
```

Not yet built: `src/lib/data`/`actions` cover accounts, categories, and expense/income
transactions only. Recurring templates, investments/savings, IOU/reimbursements, edit/delete UI,
Reports, and privacy-mode/PIN settings are all still PRD-specified but not implemented — see
`docs/MASTER_PLAN.md` for exactly what's done vs. open.

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
