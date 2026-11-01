#!/bin/zsh
# One lesson-test picture from a written brief, drawn by Codex (gpt-6-luna image generation, never code).
#
#   scripts/assets/lesson-test-art/generate.sh <name> <brief.txt> <style ref> [character portraits...]
#   e.g. … b1l04-cafe briefs/b1l04-cafe.txt src/assets/images/grammar-practice/generated/l04-two-teas-180-v1.webp \
#          src/assets/images/characters/portraits/zhongming.webp src/assets/images/characters/portraits/youmei.webp
#
# References are repo paths: the first sets the style (objects: a grammar-practice picture; scenes: a reading
# picture), the rest are the book characters whose looks must be kept. Codex saves the image under
# ~/.codex/generated_images; this copies the newest one to output/lesson-test-art/<name>.png (a second take
# becomes <name>-v2.png). Then cut and convert with cut.py. Rules: content/lesson-tests/README.md → Pictures.
set -u
ROOT=${0:A:h:h:h:h}
HERE=${0:A:h}
OUT=$ROOT/output/lesson-test-art
CODEX=${CODEX:-/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex}
NAME=$1; BRIEF=$2; shift 2
mkdir -p "$OUT/logs"
REFS=()
for ref in "$@"; do REFS+=(-i "$ROOT/$ref"); done
PROMPT="You are generating ONE illustration for a Mandarin-learning app. Use the built-in image_gen tool exactly once, then stop. Do not try to copy, move or save the file afterwards: the harness collects it. The attached images are references: the first is the STYLE reference (copy its rendering, colors and shape language, not its content); any others are character portraits whose identity (face, hair, skin tone, outfit colors) must be preserved.

$(cat "$HERE/style.txt")

$(cat "$BRIEF")

Reply with the exact prompt you sent to image_gen."
MARK="$OUT/logs/$NAME.mark"
touch "$MARK"
printf '%s' "$PROMPT" | "$CODEX" exec --skip-git-repo-check -m gpt-6-luna -c model_reasoning_effort=low -s workspace-write -C "$OUT" "${REFS[@]}" > "$OUT/logs/$NAME.log" 2>&1
CODE=$?
NEW=$(find ~/.codex/generated_images -name '*.png' -newer "$MARK" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
if [ -z "$NEW" ]; then echo "NO IMAGE for $NAME (codex exit $CODE, log: $OUT/logs/$NAME.log)"; exit 1; fi
DEST="$OUT/$NAME.png"
if [ -f "$DEST" ]; then n=2; while [ -f "$OUT/$NAME-v$n.png" ]; do n=$((n+1)); done; DEST="$OUT/$NAME-v$n.png"; fi
cp "$NEW" "$DEST"
echo "saved $DEST"
