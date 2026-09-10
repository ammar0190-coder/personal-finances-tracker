# What Ammar owes

Checked directly by `start-session` at the top of every session — update this when an item
resolves or a new one surfaces, not on a schedule.

**Status as of 2026-09-05:** the four original setup items are all done. What replaced them is
one real gap — *the hosted Supabase project has never had the schema pushed to it.*

| # | What | Gates | Cost |
|---|---|---|---|
| 1 | **`npx supabase login`** — the CLI has no access token (`supabase projects list` fails with `LegacyPlatformAuthRequiredError`). Opens a browser; only you can complete it. | Every remaining step below | 1 min |
| 2 | **`npx supabase link --project-ref <ref>`** — the repo is *not* linked (`supabase/.temp/project-ref` doesn't exist). Needs the project ref and the database password. | Pushing the schema | 2 min |
| 3 | **Decide: push the schema to the real project.** Both migrations in `supabase/migrations/` have only ever been applied to local Docker Postgres. Until `supabase db push` runs against the hosted project, its database is empty — the deployed app will fail on every query. Claude asks before doing this (`CLAUDE.md`: schema changes stop and ask). | Anything hosted working at all | 2 min |
| 4 | **Google OAuth redirect URLs** — once a Vercel domain exists, add it in *both* Google Cloud Console (Authorized redirect URI) and Supabase Auth (Site URL + Redirect URLs). The code side is already correct: the callback honours `x-forwarded-host`, and `redirectTo` is built from `window.location.origin`, so no code change is needed for a new domain. | Google sign-in working on the deployed site | 5 min |
| 5 | **Local dev needs Docker running** for `supabase start`. Run `npx supabase start` at the top of a session that needs live data; `npx supabase stop` at the end. | Any session running the app or the integration tests | seconds |
| 6 | *(Optional, unblocks real browser tests)* **`sudo npx playwright install --with-deps chromium`.** Claude can't do this — no passwordless sudo, and `libasound2` is missing, which is exactly what killed the previous attempt. One command from you makes real UI tests possible. | Any test that clicks the actual UI | 3 min |

## Resolved

- ~~Project/app name~~ — renamed to `personal-finances-tracker`.
- ~~Create a real Supabase project~~ — done. (The *project* exists; its *schema* does not — see item 3.)
- ~~Create a Google OAuth client~~ — done. (Redirect URLs still need the deployed domain — item 4.)
- ~~Create a GitHub repo and push~~ — done: `git@github.com:ammar0190-coder/personal-finances-tracker.git`, `main` tracking `origin/main`.
- ~~A Vercel account~~ — done. Not yet connected to the repo.

Not on this list: anything about the schema, the money-math rules, or IOU/reimbursement
behaviour — all of that is already pinned down in `docs/PRD.md` and doesn't need a decision from
you mid-session. If a session says it needs one of those decided, that's usually a sign the PRD
should be updated instead of the question being answered ad hoc.
