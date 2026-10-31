#!/usr/bin/env bash
# Read-only, consistent backup of the Supabase database.
#
#   DATABASE_URL=postgresql://... scripts/release/backup/dump.sh OUT_DIR
#
# Writes to OUT_DIR (never print its contents: it holds learner data):
#   db.dump            pg_dump archive of the app's schemas, data and grants
#   role-settings.sql  per-role settings (timeouts, PostgREST school-gate hook)
#   cron.sql           scheduled jobs (pg_cron lives outside the dumped schemas)
#   metadata.json      row counts, policies, grants, RLS flags, migrations, cron
#                      jobs, taken in the SAME snapshot as the dump so
#                      restore-check.sh can prove a restore is complete
#
# Needs psql + pg_dump for the server's major version (17). Encryption and
# upload happen in .github/workflows/backup.yml, never here.
set -euo pipefail

OUT=${1:?usage: dump.sh OUT_DIR}
: "${DATABASE_URL:?DATABASE_URL is required}"
HERE=$(cd "$(dirname "$0")" && pwd)
umask 077
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
rm -f "$OUT/FAILED"

# Schemas holding learner data and the rules protecting it. Platform-managed
# schemas (extensions, graphql, realtime, empty vault) come with every project.
SCHEMAS=(auth storage public private supabase_migrations)
schema_args=()
for schema in "${SCHEMAS[@]}"; do schema_args+=("--schema=$schema"); done
# The URL stays in the environment: psql's \! shell inherits it, so the
# password is never written into the script file.
export BACKUP_OUT="$OUT"
dump_cmd="pg_dump --dbname=\"\$DATABASE_URL\" --format=custom --compress=6 --no-subscriptions --no-publications ${schema_args[*]} --file=\"\$BACKUP_OUT/db.dump\""

# One REPEATABLE READ transaction exports a snapshot; pg_dump imports it while
# psql records metadata from that same snapshot, then commits.
script=$(mktemp)
trap 'rm -f "$script"' EXIT
{
  echo 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;'
  echo 'SELECT pg_export_snapshot() AS snapshot \gset'
  echo '\setenv BACKUP_SNAPSHOT :snapshot'
  printf '\\! %s --snapshot="$BACKUP_SNAPSHOT" || touch "$BACKUP_OUT/FAILED"\n' "$dump_cmd"
  printf '\\o %s\n' "$OUT/metadata.json"
  cat "$HERE/metadata.sql"
  printf '\\o %s\n' "$OUT/role-settings.sql"
  cat "$HERE/role-settings.sql"
  printf '\\o %s\n' "$OUT/cron.sql"
  echo "SELECT format('SELECT cron.schedule(%L, %L, %L);', jobname, schedule, command) FROM cron.job ORDER BY jobname;"
  echo '\o'
  echo 'COMMIT;'
} > "$script"

psql "$DATABASE_URL" --no-psqlrc --quiet -v ON_ERROR_STOP=1 -At -f "$script"

if [[ -e "$OUT/FAILED" || ! -s "$OUT/db.dump" || ! -s "$OUT/metadata.json" ]]; then
  echo "backup: pg_dump failed" >&2
  exit 1
fi
pg_restore --list "$OUT/db.dump" > /dev/null
tables=$(grep -o '"rows"' "$OUT/metadata.json" | wc -l | tr -d ' ')
echo "backup: $(du -h "$OUT/db.dump" | cut -f1) archive, $tables tables counted in the dump snapshot"
