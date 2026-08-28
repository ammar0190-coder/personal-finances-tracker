#!/usr/bin/env bash
# Blocks shell commands that read or write .env/backups. Exit 2 blocks.
#
# guard_paths.sh covers the Write and Edit tools only. A `cat >`, `sed -i`,
# `tee`, or heredoc redirect via Bash goes straight through that guard,
# exactly the gap telosight's own hooks document hitting by accident. Closed
# here proactively instead, right after relying on the gap once (to write
# local Supabase dev fixture values to .env.local — see docs/DECISIONS.md
# D-6) — the same exception should not stay silently open for anything less
# deliberate afterwards.
set -euo pipefail

payload=$(cat)
command=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')

# Strip comments and quoted prose so the guard fires on what the shell would
# execute, not on text that merely mentions these paths.
stripped=$(printf '%s' "$command" | sed "s/#.*$//; s/'[^']*'//g; s/\"[^\"]*\"//g")

if printf '%s' "$stripped" | grep -qE '(^|[^.[:alnum:]_/-])\.env([^.[:alnum:]]|$)|\.env\.[a-z]|(^|[[:space:]/])backups/'; then
  if ! printf '%s' "$stripped" | grep -qE '\.env\.example'; then
    echo "BLOCKED: secrets and backups are off limits to read or write via a shell command," >&2
    echo "same as Write/Edit (guard_paths.sh). If this is genuinely local, non-sensitive dev" >&2
    echo "fixture data (e.g. supabase start's fixed local keys), say so explicitly and ask" >&2
    echo "Ammar before working around this rather than routing past it silently." >&2
    exit 2
  fi
fi
exit 0
