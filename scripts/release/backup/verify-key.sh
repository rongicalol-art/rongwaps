#!/usr/bin/env bash
# Proves the private backup key on this Mac opens what GitHub encrypts (owner's Mac only).
# Every backup is encrypted to the public key in the GitHub variable BACKUP_AGE_RECIPIENT;
# if it isn't the public half of your saved private key, every backup is unreadable while
# every check stays green.
#
#   scripts/release/backup/verify-key.sh [private key file]
#
# Run it for the Mac copy and again for the password-manager copy (saved to a temp file).
# Prints only public keys; the private key never leaves the file.
set -euo pipefail

IDENTITY=${1:-${AGE_IDENTITY:-"$HOME/Library/Application Support/RonsMandarin/backup-key/rongwaps-backup-identity.txt"}}
command -v age-keygen > /dev/null || { echo "verify-key: install age first: brew install age" >&2; exit 1; }
command -v gh > /dev/null || { echo "verify-key: install the GitHub CLI first: brew install gh" >&2; exit 1; }
[[ -r "$IDENTITY" ]] || { echo "verify-key: private key not found at $IDENTITY" >&2; exit 1; }

mine=$(age-keygen -y "$IDENTITY")
github=$(gh variable get BACKUP_AGE_RECIPIENT)
echo "this key's public half:  $mine"
echo "GitHub encrypts to:      $github"
if [[ "$mine" == "$github" ]]; then
  echo "verify-key: OK, backups open with this key. Next: fetch.sh latest and restore-check.sh once."
else
  echo "verify-key: MISMATCH. Backups can't be opened with this key. Don't delete any key; ask Claude." >&2
  exit 1
fi
