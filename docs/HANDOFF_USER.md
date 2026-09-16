# What Ammar owes

Checked directly by `start-session` at the top of every session. Update this when an item
resolves or a new one surfaces, not on a schedule.

**Status as of 2026-09-16 (end of the M8a/M8b session):** the app is deployed at
`https://personal-finances-tracker-px1n.vercel.app` and real Google sign-in works there. The whole
visual redesign is built and the pipeline is green — but **none of it has reached the remote**, so
the live site still shows the old UI.

| # | What | Gates | Cost |
|---|---|---|---|
| 1 | **Send the five M8 commits to GitHub.** Everything is committed and the working tree is clean; the pipeline is green. Vercel redeploys on receipt, so **the live site shows the pre-M8 UI until you do this.** | The redesign reaching the live site | 1 min |
| 2 | **Read the DRAFT decisions.** `docs/DECISIONS.md` has nine awaiting you: D-12 to D-15 from last session, and **D-16 to D-20** from this one. D-16 (what the date range may scope) and D-18 (the PIN stays inert) are the two that constrain M8c, so those matter most. Strip the `> DRAFT` markers on the ones you agree with. | Nothing directly, but M8c is built on D-16 and D-18 | 15 min |
| 3 | **Look at the redesign on the live site** once it is up — especially on your phone, since it was designed phone-first. Dark is the default now, and there is no toggle until M8c. | Knowing the reskin works on a real device | 5 min |
| 4 | **"Add to Home Screen" on your phone**, then open it from the icon. Still the last unverified M7 item. | Closing M7 | 2 min |
| 5 | **Decide: Indian or Western digit grouping** for amounts (`₹12,34,567.00` vs `₹1,234,567.00`). Currently Indian (D-13). | Nothing, until you disagree | seconds |
| 6 | **Local dev needs Docker running** for `npx supabase start` (and for `test:integration`, `test:db`, `test:e2e`). It was left running at the end of this session. | Any session using local data or tests | seconds |

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
- ~~Fix the local env file to point at local Supabase~~: done 2026-09-16, and verified — the
  client bundle inlines `127.0.0.1:54321` with no hosted URL anywhere, and the integration suite
  writes to local Postgres through the server-only key.
- ~~Design input for M8~~: given 2026-09-16 (Kimi, Gemini, TradingView). The design is settled,
  recorded in `docs/superpowers/specs/2026-09-16-m8-visual-design-design.md`, and built.
- ~~Decide whether to keep `scripts/deploy-wizard.sh`~~: kept, committed 2026-09-16.

Not on this list: anything about the schema, the money-math rules, or IOU/reimbursement
behaviour. That's all pinned down in `docs/PRD.md` and shouldn't need a decision from you
mid-session. If a session says it does, the PRD probably needs updating instead.
