# What Ammar owes

Checked directly by `start-session` at the top of every session. Update this when an item
resolves or a new one surfaces, not on a schedule.

**Status as of 2026-09-16:** the app is deployed at
`https://personal-finances-tracker-px1n.vercel.app`, the hosted schema is live (all three
migrations are on the remote), and real Google sign-in works there. What's left is reviewing this
session's uncommitted work, fixing the local env file, and two quick checks on the live site.

| # | What | Gates | Cost |
|---|---|---|---|
| 1 | **Review and commit this session's work.** Nothing is committed. `git status` / `git diff` show it: the dropdown, font and money fixes, the backfill migration, and the Playwright suite. Then `git push origin main`. Vercel redeploys on push, so **the live site still has the old UI until you do this.** Read the four `DRAFT` entries D-12–D-15 in `docs/DECISIONS.md` and remove the DRAFT markers if you agree. | The fixes reaching the live site | 15 min |
| 2 | **Your local env file points at the hosted project.** The file is `.env.local`. With it, plain `npm run dev` reads and writes your **real** finance data. Put the local values back (from `npx supabase status`) and keep hosted values only in Vercel. Claude may not read or edit that file. The E2E suite is protected regardless (D-15), but manual local testing isn't. | Safe local development | 2 min |
| 3 | **Re-check the live site:** sign in → "Load starter categories" → add an account → log one expense. The backfill (D-12) should have fixed the crash; it's verified locally, not yet by you on the live site. | Confirming the live fix | 2 min |
| 4 | **"Add to Home Screen" on your phone** (browser menu), then open it from the icon. This is the last unverified M7 item. | Closing M7 | 2 min |
| 5 | **Design input for M8.** The next session starts the visual redesign. Come with: 2–3 apps or sites whose look you like, light or dark preference, and whether phone or desktop matters more. | Starting M8 well | 5 min thinking |
| 6 | **Decide: Indian or Western digit grouping** for amounts (`₹12,34,567.00` vs `₹1,234,567.00`). Currently Indian (D-13). | Nothing, until you disagree | seconds |
| 7 | **Decide: keep or delete `scripts/deploy-wizard.sh`.** The deploy is done; it's only useful if you'd redeploy from scratch. | Nothing | seconds |
| 8 | **Local dev needs Docker running** for `npx supabase start` (and for `npm run test:integration`, `test:db`, `test:e2e`). Stop it with `npx supabase stop`. | Any session using local data or tests | seconds |

**Things to remember:**
- **Your home network blocks outbound ports 5432/6543** (Postgres). `supabase db push` and
  `migration list --linked` time out on it; use your phone hotspot for anything that talks to the
  hosted database directly. `scripts/deploy-wizard.sh` checks the port first.
- **The free tier auto-pauses** the hosted project after a stretch of no traffic. If the site
  starts failing after a quiet period, restore it from the Supabase dashboard.
- **In a new terminal, `sudo npx …` can't find `npx`** (sudo resets PATH). Use
  `sudo env "PATH=$PATH" npx …`.

## Resolved

- ~~Project/app name~~: renamed to `personal-finances-tracker`.
- ~~Create a real Supabase project~~: done; restored from auto-pause 2026-09-16.
- ~~Create a Google OAuth client~~: done; redirect URLs set for the Vercel domain.
- ~~Create a GitHub repo and push~~: `git@github.com:ammar0190-coder/personal-finances-tracker.git`.
- ~~A Vercel account~~: repo imported, three env vars set, deployed.
- ~~`npx supabase login` / `link`~~: done, verified 2026-09-14.
- ~~Push the schema to the hosted project~~: done 2026-09-16 (over the hotspot), verified.
- ~~Push the backfill migration~~: done 2026-09-16; `migration list --linked` shows all three.
- ~~Real Google sign-in on the deployed site~~: worked 2026-09-16.
- ~~Install Playwright's system libraries~~: done 2026-09-16; Chromium now launches.

Not on this list: anything about the schema, the money-math rules, or IOU/reimbursement
behaviour. That's all pinned down in `docs/PRD.md` and shouldn't need a decision from you
mid-session. If a session says it does, the PRD probably needs updating instead.
