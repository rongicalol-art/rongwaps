#!/usr/bin/env bash
# Runs every supabase/tests/*.sql against a database; each file rolls its fixtures back.
#
#   npm run db:test                       # the local Supabase (supabase start)
#   DATABASE_URL=postgres://… npm run db:test   # another local or staging database
#
# Never point it at production: the tests write synthetic rows inside a transaction,
# and a crash mid-file could leave locks. It refuses the production project ref.
set -euo pipefail

URL=${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}
case "$URL" in *ylpzxpqyfaayavkvhikw*) echo "db:test: refusing the production database" >&2; exit 1;; esac
command -v psql > /dev/null || { echo "db:test: needs psql (brew install libpq)" >&2; exit 1; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
failed=0
for file in "$ROOT"/supabase/tests/*.sql; do
  if psql "$URL" --no-psqlrc -q -v ON_ERROR_STOP=1 -f "$file" > /dev/null 2> "${TMPDIR:-/tmp}/db-test.err"; then
    echo "ok   $(basename "$file")"
  else
    echo "FAIL $(basename "$file")"; sed 's/^/     /' "${TMPDIR:-/tmp}/db-test.err"; failed=1
  fi
done
exit $failed
