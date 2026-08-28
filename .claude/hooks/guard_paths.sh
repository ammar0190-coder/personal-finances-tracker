#!/usr/bin/env bash
# Blocks writes to protected paths. Exit 2 blocks the tool call.
# See CLAUDE.md "Protected paths".
set -euo pipefail

payload=$(cat)
path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')

case "$path" in
  # .env.example is the tracked template and holds placeholders by definition.
  # M0 has to write it. Content is still guarded by scan_secrets.sh.
  *".env.example") : ;;
  *".env"|*".env."*|*"backups/"*)
    echo "BLOCKED: secrets and backups are off limits." >&2
    exit 2 ;;
esac
exit 0
