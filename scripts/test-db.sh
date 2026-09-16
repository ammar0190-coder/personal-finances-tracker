#!/usr/bin/env bash
# Runs the pgTAP tests in supabase/tests against local Supabase.
# Needs `npx supabase start` first. Exits non-zero if any test fails.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

container=supabase_db_personal-finances-tracker
status=0
for f in supabase/tests/*.test.sql; do
  echo "== $f"
  out=$(docker exec -i "$container" psql -U supabase_admin -d postgres -X -q -t -v ON_ERROR_STOP=1 < "$f" 2>&1) || status=1
  echo "$out" | sed '/^\s*$/d'
  if grep -qE '^\s*not ok|# Looks like' <<<"$out"; then status=1; fi
done
exit $status
