#!/usr/bin/env bash
# Downloads and decrypts a stored backup for a restore (owner's Mac only: needs
# the private age key and the owner's `wrangler login`).
#
#   scripts/release/backup/fetch.sh latest|<object key> OUT_DIR
#
# Then prove it before using it:  scripts/release/backup/restore-check.sh OUT_DIR
# OUT_DIR holds learner data: keep it out of the repo, delete it when done.
set -euo pipefail

WHICH=${1:?usage: fetch.sh latest|<object key> OUT_DIR}
OUT=${2:?usage: fetch.sh latest|<object key> OUT_DIR}
BUCKET=${BACKUP_BUCKET:-rongwaps-backups}
IDENTITY=${AGE_IDENTITY:-"$HOME/Library/Application Support/RonsMandarin/backup-key/rongwaps-backup-identity.txt"}
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
wrangler() { "$ROOT/node_modules/.bin/wrangler" "$@"; }

[[ -r "$IDENTITY" ]] || { echo "fetch: private key not found at $IDENTITY (restore it from the password manager)" >&2; exit 1; }
command -v age > /dev/null || { echo "fetch: install age first: brew install age" >&2; exit 1; }

umask 077
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
if [[ "$WHICH" == latest ]]; then
  wrangler r2 object get "$BUCKET/LATEST" --remote --file "$tmp/LATEST" > /dev/null
  WHICH=$(tr -d '[:space:]' < "$tmp/LATEST")
fi
echo "fetch: $WHICH"
wrangler r2 object get "$BUCKET/$WHICH" --remote --file "$tmp/backup.tar.age" > /dev/null
mkdir -p "$OUT"
age -d -i "$IDENTITY" "$tmp/backup.tar.age" | tar -x -C "$OUT"
echo "fetch: decrypted into $OUT (learner data: delete when done)"
