# Dev-only scripts

None of this code ships to learners. Run via the matching `npm run …` alias or `npx tsx scripts/<folder>/<file>`.

| Folder | Contents |
| --- | --- |
| `content/` | authored-content export/validate, book pages, course examples, vocabulary pack optimizing |
| `dictionary/` | dictionary pack export/restore/compress, frequency build + apply |
| `character-decomposition/` | decomposition runtime packs + measurement |
| `strokes/` | stroke-order data vendoring + pack build |
| `audio/` | official audio download/upload/R2 sync, dialogue alignment (Python) |
| `assets/` | font vendoring, video optimizing |
| `memory-hooks/` | hook-generation pipeline (finished experiments in `archive/`); `phonetic/`, `jev/` hold sound-hook and Jev tooling |
| `dev/` | one-off helpers (`listTables.mjs`, `ui_sweep.py`) |
| `lib/` | shared script helpers |

Secrets: `scripts/.config.json` and `.env*` are never read by agents or committed.

## memory-hooks pipeline (Book 1)

Provider config lives in `.env.memory-hooks.local` (`MEMORY_HOOK_PROVIDER=opencode-go`,
model, concurrency). The key is read from `~/.local/share/opencode/auth.json`.

Run order (all via `npx tsx <script>` or the matching `npm run hooks -- <sub>` (see `memory-hooks/README.md`)):

1. Inventory and plans: `prepareBookOneEvaluationBatch.ts` (pilot stage `archive/prepareBookOnePilot.ts`; other finished experiments live in `memory-hooks/archive/`, see its README)
   → `output/memory-hooks/book-1-inventory.json`, `book-1-plans.json`.
2. Curated component labels: `proposeCuratedComponentLabels.ts` then
   `freezeCuratedComponentLabels.ts` (`EDIT_MAP` + `SKIP_GLYPHS`).
3. Generation (critic-reviewed, resumable): `generateBookOneHooks.ts` for
   characters, `generateWordHooks.ts --execute` for words.
4. Review: `prepareHookReview.ts` → edit → `applyHookReview.ts`;
   character hooks use decisions files with `applyCharacterReview.ts --decisions …`.
5. Audits: `auditMeanings.ts`, `strictHookAudit.ts`, `checkHookQuality.ts` (`hooks check`),
   `checkComponentLabelAlignment.ts` (`hooks check-labels`) for
   labels that differ from a glyph's taught meaning, and
   `checkComponentOrder.ts` (`hooks check-order`) for hooks that
   mention components out of breakdown order.
6. Ship: `exportHookPack.ts` writes `public/data/memory-hooks/book-1.json` +
   `manifest.json` (hash version). Guarded by `tests/content/memoryHook*.test.ts`.
7. Human review surface: `buildHookReviewPage.ts` (`hooks review-page`)
   emits `output/memory-hooks/review/hook-review.html` — a standalone page with
   before/after hooks, confidence tags, app-style component breakdowns, and
   keep/change/revert comments exporting as JSON for the next decision pass.
8. Acceptance coverage: `tests/acceptance/memory_hooks.test.ts` runs the
   pack integrity, emphasis, word/character order, and retired-phrasing checks
   in CI from committed data. After a decomposition-pack update, refresh its
   fixture with `hooks snapshot-order`.

Keep artifacts in `output/` (gitignored); only packs under `public/data/` and
tests are committed.

## Book-generic memory hooks (Books 2–4)

Same pipeline, parameterized by `--book N`:

1. `prepareBookHooks.ts --book N` → `book-N-inventory.json`, `book-N-plans.json`,
   `book-N-component-profiles-v2.json`, `book-N-scope.json` (new keys only).
2. `generateBookOneHooks.ts --book N --scope … --stem book-N-hooks-v3 --execute --critic`
   (characters; repairs via `--repair-report`).
3. `generateWordHooks.ts --book N --execute --scope …` (words; repairs via `--repair-report`).
4. `runHookGates.ts --book N` → gate report + repair files + `book-N-auto-ship-ids.json`.
5. `exportHookPack.ts --book N [--ids …]` → `public/data/memory-hooks/book-N.json` + manifest merge.
6. `buildHookReviewPage.ts --book N` → `output/memory-hooks/review/book-N-hook-review.html`.
7. `runBookHooks.ts --book N [--auto-ship]` chains all of the above, runs
   typecheck/lint/tests/build, and (with `--auto-ship`) commits and pushes the
   machine-clean hooks only. Logs to `output/memory-hooks/book-N-run.log`.
