# memory-hooks

One entry point: `npm run hooks -- <subcommand> [args]` (dispatcher: `cli.ts`; `npm run hooks -- help` lists all).
Shortcuts: `hooks:prepare` · `hooks:run` · `hooks:gates` · `hooks:check` · `hooks:review` · `hooks:export`.
Provider config: `.env.memory-hooks.local`. Artifacts go to `output/memory-hooks/` (gitignored); only packs under `public/data/` are committed.

## Doing a new book (N = 2, 3, 4)

1. `npm run hooks:prepare -- --book N` — inventory, plans, component profiles, scope (new keys only).
2. `npm run hooks -- generate --book N --scope … --stem book-N-hooks-v3 --execute --critic` (characters).
3. `npm run hooks -- words --book N --execute --scope …` (words). Repairs: `--repair-report`.
4. `npm run hooks:gates -- --book N` — gate report, repair files, `book-N-auto-ship-ids.json`.
5. `npm run hooks:export -- --book N [--ids …]` — writes `public/data/memory-hooks/book-N.json` + manifest.
6. `npm run hooks:review -- --book N` — human review page; fix, re-export.
7. Typecheck/lint/test (`hooks:gates` is the Book N quality gate; `hooks:check` and friends read Book 1 artifacts only).

Steps 1-5 + checks in one go: `npm run hooks:run -- --book N [--auto-ship]` (logs to `output/memory-hooks/book-N-run.log`).
Book 1 curated rollout (batches, drafts) is documented in `ROLLOUT-HANDOFF.md`; style rules in `STYLE.md`.

## Subcommands

`book` = takes `--book N`; `book1` = Book-1 artifacts only.

| Stage | Subcommand | Scope | Script |
| --- | --- | --- | --- |
| prepare | `prepare` | book | prepareBookHooks |
| | `prepare-batch` | book1 | prepareBookOneEvaluationBatch |
| | `curate-labels` / `curate-freeze` | book1 | proposeCuratedComponentLabels / freezeCuratedComponentLabels |
| | `ledger` | book1 | buildComponentLedger |
| generate | `generate` (`generate-all` = `--all`) | book | generateBookOneHooks |
| | `words` | book | generateWordHooks |
| | `sound-decide` / `repair` | book1 | decideSoundPieces / repairHooksTypesafe |
| review | `review-page` | book | buildHookReviewPage |
| | `review-prepare` / `review-apply` | book1 | prepareHookReview / applyHookReview |
| | `review-chars` / `apply-char-review` / `apply-character-review` | book1 | buildCharReviewPage / applyCharReview / applyCharacterReview |
| | `audit-meanings` / `scan` / `triage` / `gold-build` | book1 | auditMeanings / scanSoundSplit / composeCharTriage / buildGoldSet |
| | `jev-gold` / `jev-all` | book1 | reviewCharHooksTypesafe `--gold` / `--all` |
| check | `gates` | book | runHookGates |
| | `check` / `check-labels` / `check-order` / `snapshot-order` | book1 | checkHookQuality / checkComponentLabelAlignment / checkComponentOrder / snapshotComponentOrder |
| | `audit` / `validate-batch-drafts` / `jev-check` | book1 | strictHookAudit / validateBatchDrafts / typesafeClient `--check` |
| export | `run` | book | runBookHooks |
| | `export` | book | exportHookPack |
| | `apply-batch-drafts` / `apply-pack` | book1 | applyBatchDrafts / applyCuratedDraftsToPack |

Finished experiments: `archive/` (see its README).
