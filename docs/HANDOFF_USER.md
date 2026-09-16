# What Ammar owes

Checked directly by `start-session` at the top of every session. Update this when an item
resolves or a new one surfaces, not on a schedule.

**Status as of 2026-09-16 (end of the M8c session):** the app is deployed at
`https://personal-finances-tracker-px1n.vercel.app` and real Google sign-in works there. **M8 is
now complete** — the whole visual redesign plus Account Settings, the theme toggle and the
Dashboard date-range control. The pipeline is green. But **none of it has reached the remote**, so
the live site still shows the old UI.

| # | What | Gates | Cost |
|---|---|---|---|
| 1 | **Send the seven M8 commits to GitHub.** Everything is committed and the working tree is clean; the pipeline is green. Vercel redeploys on receipt, so **the live site shows the pre-M8 UI until you do this.** | The whole redesign reaching the live site | 1 min |
| 2 | **Decide what comes after M8.** The PRD's MVP is now complete apart from the PIN, which is deferred on purpose (D-18). There is no obvious next milestone, so the next session will ask rather than pick. Candidates: the PIN security milestone, PRD §15 Phase 2 items, or nothing at all — using it for a while is a legitimate answer. | The next session having a goal | 10 min |
| 3 | **Read the DRAFT decisions.** `docs/DECISIONS.md` has thirteen awaiting you: D-12 to D-15, D-16 to D-20, and **D-21 to D-24** from this session. Strip the `> DRAFT` markers on the ones you agree with. | Nothing directly | 20 min |
| 4 | **One real question, in D-23.** PRD §10.9 says an *unlinked* refund "behaves like Misc income", but the savings-rate denominator has only ever counted `type === "income"`. M8c deliberately did not change that, because it would move the savings rate. Whether §10.9 *should* apply there is a PRD question, and yours. | The savings rate being right by intent rather than by accident | 5 min |
| 5 | **Look at the redesign on the live site** once it is up — especially on your phone, since it was designed phone-first. There is now a theme toggle in Settings (the gear in the header). | Knowing the reskin works on a real device | 5 min |
| 6 | **"Add to Home Screen" on your phone**, then open it from the icon. Still the last unverified M7 item. | Closing M7 | 2 min |
| 7 | **Decide: Indian or Western digit grouping** for amounts (`₹12,34,567.00` vs `₹1,234,567.00`). Currently Indian (D-13). | Nothing, until you disagree | seconds |
| 8 | **Two cosmetic calls, both pre-existing and both left alone** as outside M8c's scope. Details in `docs/HANDOFF_NEXT_SESSION.md` §5: the account name collides with the balance at phone width (one-line fix), and date inputs show US `mm/dd/yyyy` because `<html lang="en">` resolves to en-US. | Nothing; say the word and either is quick | 2 min |
| 9 | **Local dev needs Docker running** for `npx supabase start` (and for `test:integration`, `test:db`, `test:e2e`). It was left running at the end of this session. | Any session using local data or tests | seconds |

**Things to remember:**
- **Your home network blocks outbound ports 5432/6543** (Postgres). Anything that talks to the
  hosted database directly times out on it; use your phone hotspot. `scripts/deploy-wizard.sh`
  checks the port first.
- **The free tier auto-pauses** the hosted project after a stretch of no traffic. If the site
  starts failing after a quiet period, restore it from the Supabase dashboard.
- **In a new terminal, `sudo npx …` can't find `npx`** (sudo resets PATH). Use
  `sudo env "PATH=$PATH" npx …`.

## Resolved

- ~~Project/app name~~: renamed to `personal-finances-tracker`.
- ~~Create a real Supabase project~~: done; restored from auto-pause 2026-09-16.
- ~~Create a Google OAuth client~~: done; redirect URLs set for the Vercel domain.
- ~~Create a GitHub repo~~: `git@github.com:ammar0190-coder/personal-finances-tracker.git`.
- ~~A Vercel account~~: repo imported, three env vars set, deployed.
- ~~`npx supabase login` / `link`~~: done, verified 2026-09-14.
- ~~Send the schema to the hosted project~~: done 2026-09-16 (over the hotspot), verified.
- ~~Send the backfill migration~~: done 2026-09-16; `migration list --linked` shows all three.
- ~~Real Google sign-in on the deployed site~~: worked 2026-09-16.
- ~~Install Playwright's system libraries~~: done 2026-09-16; Chromium now launches.
- ~~Review and commit the previous session's work~~: done 2026-09-16.
- ~~Fix the local env file to point at local Supabase~~: done 2026-09-16, and verified.
- ~~Design input for M8~~: given 2026-09-16 (Kimi, Gemini, TradingView). Settled, recorded in
  `docs/superpowers/specs/2026-09-16-m8-visual-design-design.md`, and built.
- ~~Decide whether to keep `scripts/deploy-wizard.sh`~~: kept, committed 2026-09-16.
- ~~Decide what the Dashboard date range may scope~~: audited and approved 2026-09-16 (D-16); the
  control is now built to exactly those terms.

Not on this list: anything about the schema, the money-math rules, or IOU/reimbursement
behaviour. That's all pinned down in `docs/PRD.md` and shouldn't need a decision from you
mid-session. If a session says it does, the PRD probably needs updating instead — **except** item
4 above, which is exactly that case.
