---
name: start-session
description: Open a working session. Reads the previous session's handoff, checks
  what Ammar owes before any work starts, and reports what's next.
---

Run this at the start of any session in this repository, and whenever Ammar says "start", "let's
go", "what's next", or opens with nothing but a greeting.

**The point of this skill is that Ammar finds out what he owes before you start building, not
after.** A few things here are only his to do — creating the Supabase project, the Google OAuth
client, a Vercel account — and each is cheap for him to clear and impossible for you to work
around.

## 1. Read, in this order

1. `CLAUDE.md`, in full.
2. `docs/HANDOFF_NEXT_SESSION.md`, in full — exact state, what the last session did, what's open.
3. `docs/MASTER_PLAN.md` — the milestone table, to find the next unbuilt milestone.
4. `docs/HANDOFF_USER.md` — check whether any open item has been resolved since (Ammar may have
   set up Supabase or OAuth between sessions without saying so; verify directly rather than
   assuming either way — e.g. does `.env` exist and carry real-looking values now?).

## 2. Verify the repo matches the handoff

```
git status --short
git log --oneline -8
```

If the working tree or history looks different from what the handoff describes, say so before
proceeding — a stale handoff acted on confidently costs more than the check does.

## 3. Check what's still open

Go through `docs/HANDOFF_USER.md`'s table directly rather than assuming it still holds — e.g. if
it says "Supabase project not created yet," check for `.env` or a `supabase/` config directory
rather than taking the doc's word for it.

## 4. Report, then stop if Ammar owes something

Sort into three buckets:

**(a) Blocks everything.** State it plainly and wait — don't start unrelated work "in the
meantime."

**(b) Blocks the next milestone specifically, but other work is available.** Name both and ask
which he wants.

**(c) Nothing needed — starting.** One line, then go.

## 5. Start

Take the next unbuilt milestone from `docs/MASTER_PLAN.md`. If it needs design decisions the PRD
doesn't already pin down, route through `superpowers:brainstorming` first; if it's a
well-specified implementation, go straight to `superpowers:test-driven-development`. Say which
milestone the work serves, in one line, before starting.
