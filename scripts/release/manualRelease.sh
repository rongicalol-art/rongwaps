#!/usr/bin/env bash
# Release the `production` branch by hand when GitHub Actions can't run (billing, outage): the same steps as
# migrate.yml + deploy.yml, run by the OWNER from their Mac with their own keys. Asks before every live change.
#
#   export PRODUCTION_DATABASE_URL='…'   # Supabase → production project → Connect → Session pooler URI
#   scripts/release/manualRelease.sh
#
# Needs: brew install postgresql@17 age (then PATH="$(brew --prefix postgresql@17)/bin:$PATH"), Docker running,
# the Supabase CLI, gh (signed in), and a Cloudflare login for wrangler (it opens the browser if needed).
# Keys are read from the environment only, never printed or written to disk.
#
#   1. backup     dump.sh + restore-check.sh (proves it restores), encrypted with the backup age key into
#                 ~/rongwaps-backups (upload it to the backup bucket later; nothing in it is readable without
#                 the owner's age key)
#   2. migrations dry run → you type yes → apply → every migration recorded
#   3. Study together server (wrangler)
#   4. app        builds the exact commit, uploads it to Cloudflare → live-site check → automatic rollback
#                 if the check fails
#   5. tag        GitHub release with notes, like deploy.yml
set -euo pipefail

REPO=rongicalol-art/rongwaps
PRODUCTION_REF=ylpzxpqyfaayavkvhikw
STAGING_REF=zpljyjcbqkrelpdzvmqz
SITE=https://ronsmandarin.com

# ENV_FILE=<path to .env>: read the keys from that file instead of the shell (values are never printed).
if [[ -n "${ENV_FILE:-}" ]]; then set -a; . "$ENV_FILE"; set +a; fi
: "${PRODUCTION_DATABASE_URL:?export PRODUCTION_DATABASE_URL first (Supabase → production project → Connect → Session pooler URI)}"
for tool in pg_dump psql age docker supabase gh node npm; do
  command -v "$tool" > /dev/null || { echo "Missing $tool. Install: brew install postgresql@17 age, then: export PATH=\"\$(brew --prefix postgresql@17)/bin:\$PATH\""; exit 1; }
done
pg_dump --version | grep -q ' 17\.' || { echo "pg_dump must be version 17 (production runs Postgres 17): export PATH=\"\$(brew --prefix postgresql@17)/bin:\$PATH\""; exit 1; }
docker info > /dev/null 2>&1 || { echo "Start Docker first (the backup is proven by restoring it in a container)."; exit 1; }

# Stages for when the owner approves from a phone: `plan` backs up and dry-runs, then stops (nothing live
# changes); `apply` runs the live steps without the typed questions (the owner already said yes to the plan).
STAGE=${1:-all}
[[ "$STAGE" =~ ^(all|plan|apply)$ ]] || { echo "usage: manualRelease.sh [plan|apply]"; exit 1; }
ask() {
  [[ "$STAGE" == apply ]] && return 0
  local answer
  read -r -p "$1 Type yes to continue: " answer
  [[ "$answer" == yes ]] || { echo "Stopped. Nothing after this step was changed."; exit 1; }
}

git fetch -q origin production
SHA=$(git rev-parse origin/production)
ANON_KEY=$(gh variable get PRODUCTION_SUPABASE_ANON_KEY --repo "$REPO")
SENTRY_DSN=$(gh variable get SENTRY_DSN --repo "$REPO" 2> /dev/null || true)
RECIPIENT=$(gh variable get BACKUP_AGE_RECIPIENT --repo "$REPO")
REPO_ROOT=$(git rev-parse --show-toplevel)
WT=$(mktemp -d)/release
git worktree add --detach -q "$WT" "$SHA"
work=$(mktemp -d)
cleanup() { rm -rf "$work"; git -C "$REPO_ROOT" worktree remove --force "$WT" > /dev/null 2>&1 || true; }
trap cleanup EXIT
cd "$WT"
echo "Releasing production ${SHA:0:8}: $(git log -1 --format=%s)"
echo

if [[ "$STAGE" != apply ]]; then
echo "== 1/5 Backup of the live database (read-only)"
stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
target=~/rongwaps-backups/manual-$stamp-pre-release-${SHA:0:8}.tar.age
mkdir -p ~/rongwaps-backups && chmod 700 ~/rongwaps-backups
DATABASE_URL="$PRODUCTION_DATABASE_URL" scripts/release/backup/dump.sh "$work/backup"
scripts/release/backup/restore-check.sh "$work/backup" "$work/evidence.json"
rm -f "$work/backup/restored-metadata.json"
tar -C "$work/backup" -cf - . | age -r "$RECIPIENT" > "$target"
rm -rf "$work/backup"
head -c 64 "$target" | grep -q 'age-encryption.org/v1'
cp "$work/evidence.json" "${target%.tar.age}.evidence.json"
python3 -c "import json,sys;e=json.load(open(sys.argv[1]));print(f\"Backup proven: {e['tables']} tables, {e['rows']} rows, {e['migrations']} migrations restored in {e['restore_seconds']}s\")" "$work/evidence.json"
echo "Saved (encrypted): $target"
echo

echo "== 2/5 Database migrations"
supabase db push --db-url "$PRODUCTION_DATABASE_URL" --dry-run
if [[ "$STAGE" == plan ]]; then echo "Plan done: backup saved, nothing live changed. Next: manualRelease.sh apply"; exit 0; fi
else
  # apply: the plan stage's backup must be from today and for this commit.
  ls ~/rongwaps-backups/manual-"$(date -u +%Y-%m-%d)"T*-pre-release-"${SHA:0:8}".tar.age > /dev/null 2>&1 \
    || { echo "No backup from today for ${SHA:0:8}: run manualRelease.sh plan first."; exit 1; }
  echo "== 2/5 Database migrations"
fi
ask "Apply the migrations above to the LIVE database?"
supabase db push --db-url "$PRODUCTION_DATABASE_URL" --yes
applied=$(psql "$PRODUCTION_DATABASE_URL" --no-psqlrc -At -c 'select version from supabase_migrations.schema_migrations')
for file in supabase/migrations/*.sql; do
  version=$(basename "$file" | cut -d_ -f1)
  grep -qx "$version" <<< "$applied" || { echo "$file is not applied: stopping before any deploy."; exit 1; }
done
echo "Every migration is recorded."
echo

echo "== 3/5 Study together server"
npm ci --ignore-scripts --silent
npx --no-install wrangler whoami > /dev/null 2>&1 || npx --no-install wrangler login
ask "Deploy the Study together server for ${SHA:0:8}?"
npx --no-install wrangler deploy --config games/wrangler.jsonc --message "release ${SHA:0:8} (manual)"
echo

echo "== 4/5 App"
ask "Deploy ${SHA:0:8} to $SITE?"
# The same build the Deploy workflow makes (public values only; source maps are uploaded by the workflow alone).
APP_ENV=production APP_COMMIT="$SHA" VITE_SUPABASE_URL="https://$PRODUCTION_REF.supabase.co" VITE_SUPABASE_ANON_KEY="$ANON_KEY" \
  VITE_AUDIO_BASE_URL=https://audio.ronsmandarin.com VITE_SENTRY_DSN="$SENTRY_DSN" CARRY_OVER_FROM="$SITE" npm run build
GITHUB_OUTPUT="$work/deploy.out" SUPABASE_ANON_KEY="$ANON_KEY" node scripts/release/cloudflare.ts deploy server/wrangler.jsonc "$SHA"
previous=$(sed -n 's/^previous_version=//p' "$work/deploy.out" | tail -1)
current=$(sed -n 's/^version=//p' "$work/deploy.out" | tail -1)
if ! node scripts/release/smoke.ts "$SITE" --env production --commit "$SHA" --supabase-ref "$PRODUCTION_REF" --forbid-ref "$STAGING_REF"; then
  if [[ -n "$previous" && "$previous" != "$current" ]]; then
    echo "The live-site check failed: rolling back to the previous release."
    node scripts/release/cloudflare.ts rollback server/wrangler.jsonc "$previous"
    node scripts/release/smoke.ts "$SITE" --env production --supabase-ref "$PRODUCTION_REF" --forbid-ref "$STAGING_REF"
  fi
  exit 1
fi
echo

echo "== 5/5 Release tag"
tag="release-$(date -u +%Y.%m.%d-%H%M)"
last=$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName // ""')
gh release create "$tag" --repo "$REPO" --target "$SHA" --title "$tag" --generate-notes ${last:+--notes-start-tag "$last"} > /dev/null
echo "Released $tag (${SHA:0:8}) to $SITE"
