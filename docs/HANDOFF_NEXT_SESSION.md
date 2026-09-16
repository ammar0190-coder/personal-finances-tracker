# Handoff — for the next Claude Code session

Rewritten **2026-09-16**, at the close of a session that ran the whole of M8a and M8b. If anything
here disagrees with what you observe, trust the repo and fix this file.

**Open with `start-session`. Close with `close-session`.**

## 0. Before anything else

- **Read `docs/HANDOFF_USER.md`.** The one thing that matters before building: **five commits are
  sitting unpushed**, so the live site still runs the pre-M8 UI.
- **The next milestone is M8c** (`docs/MASTER_PLAN.md`): Account Settings, the theme toggle, and
  the date-range control. It is bound by two decisions that were argued out at length this
  session — **D-16** (what the date range may and may not scope) and **D-18** (the PIN stays
  inert). Read both before writing any of it.

## 1. Repo state, exactly

```
Branch main. HEAD a2e462b, five commits ahead of origin/main, NONE pushed.
Working tree clean.
  a2e462b  M8b: reskin the module screens, onboarding and auth
  351e5f7  M8a: app shell, dashboard hierarchy and quick-add
  a401d20  M8a: resilient E2E baseline, design tokens and typography
  466b1b0  docs: dashboard date-range audit, and correct MASTER_PLAN's MVP claim
  41dac24  docs: M8 visual design spec and canvas artboards
Local Supabase (Docker) was left running. `npx supabase stop` if you want it down.
Build/test output on disk, all gitignored: .next/, .next-e2e/, playwright-report/, test-results/.
```

## 2. Environment gotchas (these still cost time)

- **Node isn't on PATH in Claude's non-interactive shell.** Prefix commands with
  `export PATH=/home/ammar/.local/share/fnm/node-versions/v24.18.0/installation/bin:$PATH`.
  Ammar's own terminal is fine.
- **Ammar's home network blocks outbound TCP 5432/6543.** Anything talking to the hosted database
  directly times out; a phone hotspot works.
- **The hosted Supabase project auto-pauses** on the free tier.
- **`guard_git.sh` blocks a Bash command whose *text* contains a forbidden verb**, even inside a
  quoted heredoc — writing a doc that merely mentions `git push` gets blocked. Use Write/Edit for
  that text.
- **Running the E2E suite rewrites `next-env.d.ts`** to point at `.next-e2e`, because the suite
  builds with `NEXT_DIST_DIR`. It is a build artefact, not a change: `git checkout -- next-env.d.ts`
  before handing over, or it lands in a commit.
- **`supabase test db` hangs**; use `npm run test:db` (D-12).

## 3. What this session did

**M8 design, settled with Ammar over several rounds** — spec at
`docs/superpowers/specs/2026-09-16-m8-visual-design-design.md`, canvas artboards committed in
`design/m8/` (the seeded 2.5 MB canvas output is gitignored; re-seed it from the `.dc.html` files).
Instrument Serif for display headings only, Geist for everything operational, near-black ground,
restrained indigo accent, colour reserved for exceptions.

**The date-range audit** (`docs/superpowers/specs/2026-09-16-m8-dashboard-range-audit.md`) was a
gate before any code, and it changed the shape of the work. See D-16.

**M8a:** design tokens, typography, the app shell (bottom bar on phones, sidebar on desktop),
the Dashboard restructured to the approved hierarchy, and quick-add replacing the inline form.
Before any of it, the Playwright walkthrough was made resilient.

**M8b:** Investments, IOU, Reports, onboarding and auth on the new system, no cards on module
pages, and all six recorded defects cleared.

**Five decisions recorded, D-16 to D-20, all `DRAFT`** awaiting Ammar's read.

### Bugs found that nobody asked for

- **The chart colours had drifted.** M8a moved the trend line to teal in the CSS; Recharts renders
  from a JS constant that still said blue, so the line stayed the exact colour the change existed
  to remove. A test now ties the two copies together (D-19).
- **`transaction_type` display labels were missing** for the four types a person never picks, so
  an IOU repayment rendered as the raw `iou_repayment` in recent activity (D-20).
- **Amounts were set in a monospace face** across nine files, against the type contract.
- **Two cards survived the "no cards" pass invisibly** — the Dashboard's IOU snapshot returns
  `null` when both totals are zero, so it never appeared in a screenshot, and `auth/error` was
  never reskinned. Both found by grepping for remaining `Card` imports, not by looking.
- **Recharts' default tooltip cursor** is an opaque light-grey block, unreadable on a dark ground.

**Looking at rendered screens caught things the suite did not, twice.** Keep doing it.

## 4. Pipeline at close (fresh run, 2026-09-16)

| Command | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc --noEmit` | clean |
| `npm run build` | clean |
| `npm test` | 163 passed, 31 skipped (the integration files, run below) |
| `npm run test:integration` | **31/31 passed** |
| `npm run test:db` | 8/8 ok |
| `npm run test:e2e` | 6 passed (one is an intentional `test.fail()` proving the login-redirect guard) |
| `.claude/hooks/scan_secrets.sh` | clean |

## 5. Live loose ends

- **Nothing is pushed.** Five commits local. The live site runs the pre-M8 UI until Ammar pushes.
- **The integration suite's flakiness did not reproduce** this session — 31/31 on the close-out
  run. It failed once during M8a's E2E, but that failure's error text was **not captured** and
  Playwright wiped the artefacts on the next run, so it is unattributed. Do not claim it was the
  known `PGRST303` clock artefact; it may have been. Next failure, keep the log before rerunning.
- **`ledger-check` was not run**, deliberately: nothing in this session's diff touches money math.
  The changes to `burn-down`, `masked-balance`, `iou-entry-row` and `holdings-list` are class names
  only, and the walkthrough still asserts the exact end-to-end balance.
- **The PIN boundary test does not exist yet.** D-18 specifies it; it lands with the Settings
  screen in M8c. Until then the boundary is documented but unenforced.
- **Carried over, still open:**
  - reimbursement flagging is a follow-up action, not a checkbox at logging time (PRD §12 wording);
  - `getCurrentBudgetCycle` assumes a single `is_spend_account` — explicitly out of scope for the
    date-range work, and it must not change behaviour by accident;
  - recent activity's primary line is the account name, which reads oddly; it predates M8 and was
    left alone.
- **`CardTitle` renders a `div`, not a heading element**, so section titles are not in the
  document outline. The new sections use real `<h2>`s; the remaining `CardTitle` (the burn-down)
  does not. Worth fixing if that component is touched again.
