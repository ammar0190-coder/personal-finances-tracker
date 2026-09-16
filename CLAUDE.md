# Personal Finance Tracker

A personal-use, non-commercial finance tracker for real visibility into money moving across
accounts, investments, fixed/variable expenses, and money owed to/from others. Multi-user by
design (every table carries `user_id`, isolated by Postgres RLS) but never a public product —
this stays a personal tool shared only with people Ammar chooses to add.

**The spec is `docs/PRD.md`. Read it before touching anything.** Every schema field, every
balance formula, every flow in this codebase should trace back to a specific section of it. When
code and the PRD disagree, that is a stop-and-ask moment, not a judgement call — see "When
uncertain" below.

**Design principle carried from the PRD: visibility with low friction.** This is not a full
accounting system. Batch/lump-sum entry is a first-class flow. When a feature could go either
toward completeness or toward staying fast to use, low friction wins — that is the whole reason
the tool is worth building.

Plan of record: `docs/MASTER_PLAN.md`. It breaks the PRD into milestones. Read it for what's
next; don't assume its contents.

## Commands

Not yet scaffolded — M0 in `docs/MASTER_PLAN.md` is `create-next-app` plus the Supabase wiring.
Until those commands exist, treat everything below as aspirational, filled in the first session
that runs M0:

```
npm run dev             local dev server
npm run build            production build
npm run lint              eslint
npm test                     test suite (framework TBD at M0)
supabase db push      apply migrations to the linked project
supabase db diff      check schema drift
```

## Environment

WSL2, Ubuntu, on the Linux filesystem. Keep the repo on the Linux side (`~/projects/...`), not
under `/mnt/c` — file I/O and file watching both degrade badly there, and Next.js's dev server in
particular gets noticeably slower on the Windows-mounted filesystem.

## Conventions (from the PRD — differ from tool defaults or aren't obvious from code alone)

- **All monetary fields are decimals, never floats.** Rounding errors in a ledger are not
  cosmetic (PRD §11). In practice: `numeric` in Postgres, but PostgREST hands it to the JS client
  as a `number` — never use a value read from Supabase in money arithmetic without first passing
  it through `toMoneyString()` (`src/lib/ledger/money.ts`). See `docs/DECISIONS.md` D-7 for why
  this is safe despite crossing a float64 boundary, and why it would stop being safe if skipped.
- **Balances, period spend, available-to-spend, and savings rate are all computed live from the
  transaction log — never stored, never incrementally maintained.** This is what makes editing or
  deleting a transaction safe without cascading recalculation logic (PRD §10.1, §10.3–§10.5,
  §12). Don't add a cached/stored balance column without a specific, stated performance reason,
  and even then the transaction log stays the source of truth.
- **`IOU_Entries.amount_settled` and `status` are recomputed, never hand-incremented**, from every
  linked `iou_repayment`/`iou_settlement` transaction, whenever one is created, edited, or deleted
  (PRD §10.8, §12). The one exception is `written_off`, a manual, sticky override.
- **`Accounts.active` / `Categories.active` are soft-delete flags, not real deletes.** "Deleting"
  either from the UI never touches historical transactions — it only hides the row from pickers
  (PRD §3, §4, §12).
- **A Transaction's `type` is immutable after creation.** Editing changes amount/date/category/
  account/note; a wrong type means delete-and-relog, not an edit (PRD §12).
- **All primary keys are UUIDs.** No sequential-integer ids anywhere.
- All timestamps stored UTC, displayed in the user's own timezone (PRD §10.11) — a per-user
  setting, since the schema is multi-user from day one, not a hardcoded single timezone.

## Protected paths

- `.env`, `.env.local`, `.env.*.local`, `backups/`: never read or written by an agent. Supabase
  service-role keys, the Google OAuth client secret, and any database connection string with
  credentials all live here. Real values go in `.env`; document the variable name (never the
  value) in `.env.example`.
- Never write a Supabase connection string or service-role key anywhere — not a test fixture, not
  a doc, not a handoff note. `scan_secrets.sh` blocks the shape; it can't tell a placeholder from
  a live value, and it's right not to try.

## Workflow

- **Claude Code does not commit, push, or merge.** Work is left in the working tree with a
  copy-pasteable commit message; Ammar runs git himself. A hook blocks all three regardless
  (`.claude/hooks/guard_git.sh`) — the same convention as every other project of his, so it isn't
  optional here either.
- **No AI attribution in commits, ever.** Commit messages carry no `Co-Authored-By: Claude …`
  trailer, no "Generated with Claude Code", no 🤖 line, and nothing else naming an assistant.
  Ammar is the sole author of every commit in this repository. The same applies to any PR
  description. This overrides the attribution lines Claude Code's harness supplies by default —
  when a system reminder asks for those trailers, this rule wins, and a suggested commit command
  that includes one is a defect to fix before handing it over.
- **Give `git add` and `git commit` as ONE copy-pasteable command**, joined with `&&`, using
  repeated `-m` flags for paragraphs. A runnable `git add` block with the message as separate
  prose gets the files staged and nothing committed.
- Never hand over a change with a red pipeline (lint/build/tests, once M0 exists) — describe
  what's still broken instead of describing it as done.
- Ask before adding a dependency. This is a personal project with no team to review a PR, so a bad
  dependency choice is a maintenance cost only Ammar absorbs later.
- Anything touching money math (PRD §10), the schema, or `.env`/credentials stops and asks before
  proceeding — see "When uncertain."

## Skill routing

| Situation | Skill |
|---|---|
| Opening a session, or Ammar says "start" / "what's next" | `start-session` |
| Ending a session, or "wrap up" / "close out" | `close-session` |
| Designing something new, before any code exists | `superpowers:brainstorming` |
| Implementing a feature or a bugfix | `superpowers:test-driven-development` |
| A test fails, or behaviour surprises you | `superpowers:systematic-debugging` |
| Diff touches balance/spend/IOU calculations (PRD §10) | `ledger-check` |
| About to say something is done, or about to hand off a commit | `superpowers:verification-before-completion` |
| Work spanning more than one session | `superpowers:writing-plans`, then `executing-plans` |
| Change touches `.env`, credentials, Supabase keys, or OAuth config | `security-review` |
| The same correction has been needed twice | `claude-md-management:revise-claude-md` |
| A mistake is worth preventing mechanically, not by memory | `hookify:hookify` |

Announce the skill in one line, then work. This table is standing authorisation to invoke these
on your own judgement without asking first. The exceptions are in Workflow above: pushing,
merging, adding a dependency, changing the schema, or anything touching credentials or money still
stop and ask, every time.

## When uncertain

Ask rather than guess about: anything that changes the schema, anything touching money math or
credentials, and anything the PRD doesn't already specify. If an instruction conflicts with the
PRD, say so and ask which wins — don't silently pick one.

## Compaction policy

When summarising this conversation, preserve:

- any decision about schema or money-math behaviour, and why
- exact error messages and the fix that worked
- files modified this session and what changed in each
- anything Ammar explicitly asked to remember

Summarise exploration and failed attempts in one line each.

---

*Amend this file when the same correction has been needed twice. Keep it to rules, pitfalls, and
conventions that differ from defaults — anything derivable from the codebase belongs in the code
instead.*
