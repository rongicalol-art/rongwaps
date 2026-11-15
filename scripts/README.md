# Dev-only scripts

None of this code ships to learners. Run via the matching `npm run …` alias or `npx tsx scripts/<folder>/<file>`.

| Folder | Contents |
| --- | --- |
| `content/` | authored-content export/validate, book pages, course examples, vocabulary pack optimizing |
| `dictionary/` | dictionary pack export/restore/compress, frequency build + apply |
| `character-decomposition/` | decomposition runtime packs + measurement |
| `strokes/` | stroke-order data vendoring + pack build |
| `audio/` | official audio download/upload/R2 sync, dialogue alignment (Python) |
| `assets/` | font vendoring, video optimizing, `lesson-test-art/` (Codex picture briefs, `generate.sh`, `cut.py`) |
| `fonts/` | `split-chinese-fonts.py` (`npm run fonts:split`): slices `content/fonts/*.woff2` into unicode-range woff2 under `public/fonts/<family>/` + `src/styles/fonts.generated.css`; rerun after content changes |
| `memory-hooks/` | `buildHookPacks.ts` (`npm run hooks:packs`): builds the memory-hook packs from `content/memory-hooks/` (see its README); `phonetic/`, `jev/` hold sound-map and Jev tooling |
| `dev/` | one-off helpers (`listTables.mjs`, `ui_sweep.py`) |
| `release/` | release safety used by CI and git hooks: `secretScan.ts`, `checkMigrations.ts` (see `docs/RELEASING.md`) |
| `load/` | Study together load test against a local Worker or staging; CI runs its budgets (`npm run games:load`, see `load/README.md`) |
| `lib/` | shared script helpers |

Secrets: `scripts/.config.json` and `.env*` are never read by agents or committed.
