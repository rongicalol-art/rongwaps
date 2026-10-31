#!/usr/bin/env bash
# End-to-end test of the backup tooling with synthetic data only:
# local Supabase stack (every migration applied) + fake learners → dump.sh →
# restore-check.sh. CI runs it whenever migrations or these scripts change,
# so a migration that would break restores fails its PR.
#
#   supabase start   # local stack; migrations apply on start
#   scripts/release/backup/selftest.sh [DB_CONTAINER]   (default supabase_db_rongwaps)
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
DB=${1:-supabase_db_rongwaps}
WORK=$(mktemp -d)
trap '[[ -n "${KEEP_WORK:-}" ]] || rm -rf "$WORK"; docker exec "$DB" rm -rf /tmp/backup-scripts /tmp/backup-out > /dev/null 2>&1 || true' EXIT

sql() { docker exec -i -e PGPASSWORD=postgres "$DB" psql -h localhost -U supabase_admin -d postgres --no-psqlrc -q -v ON_ERROR_STOP=1 -At; }

# Synthetic learners with Google identities, progress and history (never real data).
sql <<'SQL' > /dev/null
WITH fake AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         format('selftest-%s-%s@example.invalid', i, floor(random() * 1e9)::bigint), now(), '{"provider":"google"}', '{}', now(), now()
  FROM generate_series(1, 25) AS i
  RETURNING id, email
)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
SELECT gen_random_uuid(), id, id::text, 'google', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now()
FROM fake;
INSERT INTO public.user_card_progress (user_id, card_id)
SELECT u.id, format('selftest-card-%s', c) FROM auth.users u CROSS JOIN generate_series(1, 40) AS c
WHERE u.email LIKE 'selftest-%'
ON CONFLICT DO NOTHING;
SQL

docker exec "$DB" mkdir -p /tmp/backup-scripts
docker cp "$ROOT/scripts/release/backup/." "$DB:/tmp/backup-scripts/" > /dev/null
docker exec -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" "$DB" \
  bash /tmp/backup-scripts/dump.sh /tmp/backup-out
docker cp "$DB:/tmp/backup-out/." "$WORK/" > /dev/null

RESTORE_IMAGE=${RESTORE_IMAGE:-$(docker inspect --format '{{.Config.Image}}' "$DB")} \
  "$ROOT/scripts/release/backup/restore-check.sh" "$WORK" "$WORK/evidence.json"
python3 -c "import json,sys; e=json.load(open(sys.argv[1])); sys.exit(0 if e['ok'] and e['rows'] >= 1000 else 1)" "$WORK/evidence.json"
[[ -n "${KEEP_WORK:-}" ]] && echo "selftest: kept $WORK" >&2 || true
