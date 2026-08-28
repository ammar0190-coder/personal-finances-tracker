#!/usr/bin/env bash
# Blocks a write whose content looks like a live credential. Exit 2 blocks.
set -euo pipefail

content=$(jq -r '.tool_input.content // .tool_input.new_string // ""')

# Deliberately noisy: a false positive costs one message, a false negative costs
# a rotated key and an incident. Covers: Supabase/JWT-shaped keys (anon and
# service-role are both JWTs), Postgres connection strings with embedded
# credentials, and Google OAuth client secrets.
if printf '%s' "$content" | grep -qE \
   '(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|postgres(ql)?://[^ ]*:[^ @]+@|GOCSPX-[A-Za-z0-9_-]{20,})'; then
  echo "BLOCKED: this content looks like it contains a live credential." \
       "Use an environment variable and document it (name only) in .env.example." >&2
  exit 2
fi
exit 0
