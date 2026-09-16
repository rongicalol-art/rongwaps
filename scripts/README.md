# Dev-only scripts

None of this code ships to learners. `scripts/memory-hooks/` and
`scripts/vocab-qa/` are data pipelines whose outputs are committed artifacts
(packs in `public/data/` and review files in `output/`).

## memory-hooks pipeline (Book 1)

Provider config lives in `.env.memory-hooks.local` (`MEMORY_HOOK_PROVIDER=opencode-go`,
model, concurrency). The key is read from `~/.local/share/opencode/auth.json`.

Run order (all via `npx tsx <script>` or the matching `npm run memory-hooks:*`):

1. Inventory and plans: `prepareBookOnePilot.ts`, `prepareBookOneEvaluationBatch.ts`
   → `output/memory-hooks/book-1-inventory.json`, `book-1-plans.json`.
2. Curated component labels: `proposeCuratedComponentLabels.ts` then
   `freezeCuratedComponentLabels.ts` (`EDIT_MAP` + `SKIP_GLYPHS`).
3. Generation (critic-reviewed, resumable): `generateBookOneHooks.ts` for
   characters, `generateWordHooks.ts --execute` for words.
4. Review: `prepareHookReview.ts` → edit → `applyHookReview.ts`; word hooks use
   decisions files with `applyWordReview.ts --decisions … --additions … --refresh-meanings`;
   character hooks use decisions files with `applyCharacterReview.ts --decisions …`.
5. Audits: `auditMeanings.ts` / `applyMeaningAudit.ts`, `verifyHooks.ts`,
   `strictHookAudit.ts`, `checkHookQuality.ts` (`memory-hooks:check`),
   `checkComponentLabelAlignment.ts` (`memory-hooks:check:labels`) for
   labels that differ from a glyph's taught meaning, and
   `checkComponentOrder.ts` (`memory-hooks:check:order`) for hooks that
   mention components out of breakdown order.
6. Ship: `exportHookPack.ts` writes `public/data/memory-hooks/book-1.json` +
   `manifest.json` (hash version). Guarded by `tests/memoryHook*.test.ts`.
7. Human review surface: `buildHookReviewPage.ts` (`memory-hooks:review:page`)
   emits `output/memory-hooks/review/hook-review.html` — a standalone page with
   before/after hooks, confidence tags, app-style component breakdowns, and
   keep/change/revert comments exporting as JSON for the next decision pass.
8. Acceptance coverage: `tests/acceptance/memory_hooks.test.ts` runs the
   pack integrity, emphasis, word/character order, and retired-phrasing checks
   in CI from committed data. After a decomposition-pack update, refresh its
   fixture with `memory-hooks:snapshot:order`.

## vocab-qa pipeline (Books 1–4)

1. `vocab-qa/auditVocabulary.ts` → deterministic audit
   (`output/vocab-qa/vocabulary-audit-v1.json`).
2. `vocab-qa/proofreadVocabulary.ts --execute` → resumable model proofread
   (same provider env as memory-hooks).
3. `vocab-qa/buildVocabQaDecisions.ts` → review file
   (`vocabulary-qa-decisions-v1.json` + `vocabulary-qa-review-v1.md`).
4. After review: `vocab-qa/applyVocabFixes.ts --execute` updates Supabase
   `book_vocabulary` (service role from `.env`), then run
   `npx tsx scripts/exportVocabularyPacks.ts` to re-export the packs. Guarded by
   `tests/vocabularyPack.test.ts`.

Keep artifacts in `output/` (gitignored); only packs under `public/data/` and
tests are committed.
