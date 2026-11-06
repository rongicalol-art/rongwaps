#!/usr/bin/env bash
# The full CI suite on this machine. PRs into main then need only GitHub's secret scan and migration check
# (ci.yml); paste the summary into the PR. Browser journeys and the backup self-test run when the changed
# files need them (the same paths CI used), or always with --all.
#
#   npm run gate            # checks for what changed against origin/main
#   npm run gate -- --all   # every check, journeys and backup self-test included
#
# Journeys and the self-test need Docker and the Supabase CLI (a throwaway local stack, fake learners only).
# Logs: output/gate/<check>.log; summary: output/gate/summary.md.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

all=false
[[ "${1:-}" == "--all" ]] && all=true
out=output/gate
rm -rf "$out" && mkdir -p "$out"

git fetch -q --no-tags origin main 2> /dev/null || true
changed=$( { git diff --name-only origin/main...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)
needs() { $all || grep -qE "$1" <<< "$changed"; }

failed=0
lines=()
check() {
  local name=$1; shift
  local start=$SECONDS
  printf '%-14s ' "$name"
  if "$@" > "$out/$name.log" 2>&1; then
    lines+=("- pass: \`$name\` ($((SECONDS - start)) s)"); echo "pass ($((SECONDS - start)) s)"
  else
    lines+=("- **FAIL**: \`$name\` (log $out/$name.log)"); echo "FAIL (see $out/$name.log)"; failed=1
  fi
}
skip() { lines+=("- skipped: \`$1\` ($2)"); printf '%-14s skipped (%s)\n' "$1" "$2"; }

check migrations npx tsx scripts/release/checkMigrations.ts origin/main
check typecheck npm run typecheck
check lint npm run lint
check games-check npm run games:check
check games-dry npx --no-install wrangler deploy --dry-run --config games/wrangler.staging.jsonc
check games-test npm run games:test
if needs '^(games|shared)/|^scripts/load/'; then check games-load npm run games:load; else skip games-load 'no games/ or shared/ change'; fi
check test npm test
check content npm run content:validate
check jev-lint npm run jev:lint
# Placeholders so the client bundle builds, as in CI; never real keys.
check build env VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_ANON_KEY=placeholder-anon-key npm run build
check perf npm run perf:check

journeys='^(src/services|src/store|src/hooks|src/utils/sync|src/screens/auth|server|supabase|tests/e2e)/|^(playwright\.config\.ts|package-lock\.json)$'
backup='^(supabase|scripts/release/backup)/|^\.github/workflows/backup\.yml$'
# A throwaway stack of its own (project rongwaps_gate, every port +1000), so a local stack someone else is
# running (supabase_*_rongwaps) is never reused or stopped. Every migration applies on start; stopped at the end.
export E2E_SUPABASE_WORKDIR=output/gate-stack E2E_SUPABASE_PROJECT=rongwaps_gate
stack_start() {
  rm -rf "$E2E_SUPABASE_WORKDIR" && mkdir -p "$E2E_SUPABASE_WORKDIR" && cp -R supabase "$E2E_SUPABASE_WORKDIR/" || return 1
  sed -i '' -E -e 's/^project_id = .*/project_id = "rongwaps_gate"/' -e 's/^((shadow_)?port = )54/\155/' \
    -e 's/^(inspector_port = )8083/\19083/' "$E2E_SUPABASE_WORKDIR/supabase/config.toml" || return 1
  supabase start --workdir "$E2E_SUPABASE_WORKDIR" -x studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,mailpit,postgres-meta
}
stack_stop() { [[ -d "$E2E_SUPABASE_WORKDIR/supabase" ]] && supabase stop --workdir "$E2E_SUPABASE_WORKDIR" --no-backup > /dev/null 2>&1; }
if needs "$journeys" || needs "$backup"; then
  trap stack_stop EXIT
  check supabase stack_start
fi
if needs "$journeys"; then
  journey_run() {
    local env_out api anon
    env_out=$(supabase status -o env --workdir "$E2E_SUPABASE_WORKDIR")
    api=$(sed -nE 's/^API_URL="?([^"]*)"?$/\1/p' <<< "$env_out")
    anon=$(sed -nE 's/^ANON_KEY="?([^"]*)"?$/\1/p' <<< "$env_out")
    [[ -n "$api" && -n "$anon" ]] || { echo "the gate stack has no API (supabase status: $(cut -d= -f1 <<< "$env_out" | tr '\n' ' '))"; return 1; }
    VITE_SUPABASE_URL="$api" VITE_SUPABASE_ANON_KEY="$anon" npm run build && npx playwright test
  }
  check journeys journey_run
else
  skip journeys 'no saving, sign-in, server or database change'
fi
if needs "$backup"; then check backup scripts/release/backup/selftest.sh supabase_db_rongwaps_gate; else skip backup 'no migration or backup change'; fi

{
  echo "Local gate (\`npm run gate\`) on $(git rev-parse --short HEAD), $(date '+%Y-%m-%d %H:%M'):"
  printf '%s\n' "${lines[@]}"
} > "$out/summary.md"
echo; cat "$out/summary.md"
exit $failed
