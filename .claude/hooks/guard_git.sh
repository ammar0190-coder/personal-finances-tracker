#!/usr/bin/env bash
# Blocks Claude Code from committing, pushing or merging. Exit 2 blocks the call.
# Ammar's projects share this convention: he commits, from his own account, always.
# A hook rather than a CLAUDE.md line because a rule that depends on being
# remembered is one a compaction can lose.
set -euo pipefail

payload=$(cat)
command=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')

# Strip quoted strings before matching, so a commit *message* mentioning "git
# push" does not trip the guard on its own text. Match the verb, not prose.
stripped=$(printf '%s' "$command" | sed "s/'[^']*'//g; s/\"[^\"]*\"//g")

# Every `git <subcommand>` in the line, global options skipped, one per line.
subcommands=$(
  printf '%s\n' "$stripped" \
    | grep -oE '\bgit([[:space:]]+-[A-Za-z-]+([[:space:]]+[^[:space:]]+)?)*[[:space:]]+[a-z][a-z-]*' \
    | sed -E 's/.*[[:space:]]//' || true
)

blocked=""
for sub in $subcommands; do
  case "$sub" in
    commit) blocked="commit" ;;
    push) blocked="push" ;;
    merge) blocked="merge" ;;
  esac
done

# `gh` reaches the same place by another road.
case "$stripped" in
  *"gh pr merge"*) blocked="merge" ;;
  *"gh pr create"*) blocked="pull request" ;;
esac

if [ -n "$blocked" ]; then
  echo "BLOCKED: Claude Code does not run '$blocked' in this repository." >&2
  echo "Ammar does it from his own account. Leave the work in the working tree" >&2
  echo "and hand him a copy-pasteable block naming what changed and how to undo it." >&2
  exit 2
fi
exit 0
