---
name: close-session
description: End-of-session close-out. Verifies the pipeline (once one exists),
  updates both handoff documents, and states plainly whether Ammar can start the
  next session immediately or must do something first.
---

Run this at the end of any session that changed the repository, and whenever Ammar says "wrap
up", "close out", or "end of session." Don't skip a step because the session felt small — a short
session that ends without a handoff update is exactly how the next session rediscovers something
at its own expense.

## 1. Verify, before claiming anything

Once M0 has run, this means the real pipeline (lint/build/test — see `CLAUDE.md` Commands),
pasted in full, not summarised. Before that exists, this step is "confirm the working tree
actually reflects what you're about to describe" — `git status --short` and `git diff --stat`.

## 2. Decision log

Check `docs/DECISIONS.md` against what this session did. Did it choose a schema shape, a
money-math rule not already pinned down by the PRD, or depart from the PRD in any way? Each owes
an entry, written now while the reasoning is fresh, marked `> DRAFT` until Ammar reads it.

## 3. Check the milestone

Say which milestone in `docs/MASTER_PLAN.md` this session moved, and whether it's now complete. A
session that produced changes but didn't finish a milestone is worth naming as such plainly —
information, not a failure.

## 4. Update `docs/HANDOFF_NEXT_SESSION.md`

Rewrite it, don't append. Carry only what the tracked docs can't: exact repo state, what this
session did, and what's live now. Everything else has a home already: `CLAUDE.md` for rules,
`MASTER_PLAN.md` for what's next, `DECISIONS.md` for why, `PRD.md` for behaviour, `REPO_LAYOUT.md`
for where things live.

## 5. Update `docs/HANDOFF_USER.md` if it's drifted

Only if something changed — an item resolved, a new one surfaced. If nothing changed, say so and
leave it alone.

## 6. Tell Ammar the verdict, in one short block

- **Pipeline:** result, or "not applicable yet — pre-M0."
- **Changed:** what, and how to undo it (nothing is committed — see `CLAUDE.md` Workflow).
- **Needs Ammar before next session:** a numbered list, or "nothing."
- **Next session starts with:** the milestone name and its first step.

## What this doesn't do

It doesn't commit, push, or open anything on GitHub. That's Ammar's, every time, from his own
account.
