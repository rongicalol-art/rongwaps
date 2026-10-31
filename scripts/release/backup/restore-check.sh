#!/usr/bin/env bash
# Proves a backup restores completely, in a throwaway container with no network.
#
#   scripts/release/backup/restore-check.sh BACKUP_DIR [EVIDENCE_JSON]
#
# BACKUP_DIR is what dump.sh wrote (decrypted). Restores it into the Supabase
# Postgres image production runs, replays role settings and cron jobs (jobs
# never fire: cron.launch_active_jobs=off), recomputes metadata.sql and fails
# unless row counts, policies, grants, RLS, functions, triggers, migrations
# and cron jobs all match the backup's own snapshot. EVIDENCE_JSON receives
# aggregate results only (no learner data). The same steps restore a real
# project: see docs/RELEASING.md → Restore data.
set -euo pipefail

IN=$(cd "${1:?usage: restore-check.sh BACKUP_DIR [EVIDENCE_JSON]}" && pwd)
EVIDENCE=${2:-}
HERE=$(cd "$(dirname "$0")" && pwd)
IMAGE=${RESTORE_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.113}
NAME="rongwaps-restore-check-$$"
SCHEMAS=(auth storage public private supabase_migrations)
started=$(date +%s)

docker run -d --name "$NAME" --network none -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
  "$IMAGE" postgres -D /etc/postgresql -c cron.launch_active_jobs=off > /dev/null
trap 'docker rm -f "$NAME" > /dev/null 2>&1 || true' EXIT

# The image initializes on a socket-only server first; TCP answers once it is final.
for _ in $(seq 1 120); do
  docker exec "$NAME" pg_isready -h localhost -U supabase_admin -q 2> /dev/null && break
  sleep 2
done
docker exec "$NAME" pg_isready -h localhost -U supabase_admin -q
sql() { docker exec -i "$NAME" psql -h localhost -U supabase_admin -d postgres --no-psqlrc -q -v ON_ERROR_STOP=1 -At "$@"; }

docker cp "$IN/db.dump" "$NAME:/tmp/db.dump" > /dev/null

# Fresh schemas owned like Supabase's, and the extensions the backup used,
# then everything else from the archive (its own CREATE SCHEMA lines skipped).
{
  printf 'DROP SCHEMA IF EXISTS %s CASCADE;\n' "$(IFS=,; echo "${SCHEMAS[*]}")"
  echo 'CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;'
  echo 'CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;'
  echo 'CREATE SCHEMA public AUTHORIZATION pg_database_owner;'
  echo 'CREATE SCHEMA private AUTHORIZATION postgres;'
  echo 'CREATE SCHEMA supabase_migrations AUTHORIZATION postgres;'
  python3 - "$IN/metadata.json" <<'PY'
import json, sys
for ext in json.load(open(sys.argv[1]))['extensions']:
    if ext['name'] != 'plpgsql':
        print(f'CREATE EXTENSION IF NOT EXISTS "{ext["name"]}" WITH SCHEMA "{ext["schema"]}";')
PY
} | sql

docker exec "$NAME" sh -c 'pg_restore --list /tmp/db.dump | grep -v -E "^[0-9]+; [0-9]+ [0-9]+ (SCHEMA|EXTENSION|COMMENT - EXTENSION) " > /tmp/restore.list'
docker exec "$NAME" pg_restore -h localhost -U supabase_admin -d postgres --exit-on-error --single-transaction \
  --use-list=/tmp/restore.list /tmp/db.dump
sql < "$IN/role-settings.sql"
[[ -s "$IN/cron.sql" ]] && sql < "$IN/cron.sql" > /dev/null
restored_seconds=$(( $(date +%s) - started ))

{ echo 'BEGIN;'; cat "$HERE/metadata.sql"; echo 'COMMIT;'; } | sql > "$IN/restored-metadata.json"

python3 - "$IN/metadata.json" "$IN/restored-metadata.json" "$EVIDENCE" "$IMAGE" "$restored_seconds" <<'PY'
import json, sys
backup, restored = (json.load(open(path)) for path in sys.argv[1:3])
evidence_path, image, seconds = sys.argv[3], sys.argv[4], int(sys.argv[5])
problems = []
for key in sorted(set(backup) | set(restored)):
    if key == 'server_version':
        continue
    if backup.get(key) != restored.get(key):
        if key == 'tables':
            before = {t['table']: t['rows'] for t in backup[key]}
            after = {t['table']: t['rows'] for t in restored.get(key) or []}
            diff = [f'{t}: {before.get(t)} -> {after.get(t)}' for t in sorted(set(before) | set(after)) if before.get(t) != after.get(t)]
            problems.append('row counts differ: ' + '; '.join(diff[:20]))
        else:
            problems.append(f'{key} differ')
evidence = {
    'ok': not problems,
    'problems': problems,
    'image': image,
    'source_server_version': backup.get('server_version'),
    'tables': len(backup['tables']),
    'rows': sum(t['rows'] for t in backup['tables']),
    'policies': len(backup.get('policies') or []),
    'migrations': len(backup.get('migrations') or []),
    'cron_jobs': len(backup.get('cron_jobs') or []),
    'restore_seconds': seconds,
}
if evidence_path:
    json.dump(evidence, open(evidence_path, 'w'), indent=2)
print(f"restore-check: {'OK' if evidence['ok'] else 'FAILED'}: {evidence['tables']} tables, {evidence['rows']} rows, "
      f"{evidence['policies']} policies, {evidence['migrations']} migrations restored in {seconds}s")
for problem in problems:
    print(f'  {problem}')
sys.exit(0 if evidence['ok'] else 1)
PY
