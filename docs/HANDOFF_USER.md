# What Ammar owes

Checked directly by `start-session` at the top of every session — update this when an item
resolves or a new one surfaces, not on a schedule.

| # | What | Gates | Cost |
|---|---|---|---|
| 1 | **Create a real Supabase project** (free tier is fine) and put its URL + publishable key + secret key in `.env.local`, replacing the local-dev values `.env.example` documents the shape of | Anything running against real, persistent data instead of local Docker Postgres | 5 min |
| 2 | **Create a Google OAuth client** (Google Cloud Console) and wire it into Supabase Auth's Google provider | The actual Google sign-in flow — everything downstream of auth has been verified against local Supabase's own auth, but never against real Google OAuth | 15 min |
| 3 | **Create a GitHub repo and push** (Claude Code doesn't do this — see `CLAUDE.md` Workflow). Everything through M0 and part of M1 is staged and ready for a first commit. | Having any remote backup of this work at all | 5 min |
| 4 | **A Vercel account**, connected to the GitHub repo once it exists | M7 (deploy), not sooner | 10 min |
| 5 | **Local dev needs Docker running** for `supabase start` (Postgres, Auth, etc. in containers) — already confirmed working on this machine. Run `npx supabase start` at the top of a session that needs live data; `npx supabase stop` at the end. | Any session that runs the app or the integration/RLS tests (`npm run test:rls`) | seconds, once Docker's up |

~~Project/app name~~ — resolved: renamed to `personal-finances-tracker` in this session.

Not on this list: anything about the schema, the money-math rules, or IOU/reimbursement
behaviour — all of that is already pinned down in `docs/PRD.md` and doesn't need a decision from
you mid-session. If a session says it needs one of those decided, that's usually a sign the PRD
should be updated instead of the question being answered ad hoc.
