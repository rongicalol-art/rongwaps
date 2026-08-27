# RongWaps Audit — Dictionary/Breakdown Data Consistency — 2026-08-26

Deep dive into a user-reported inconsistency: the breakdown tree card for 覀 said
"No meaning recorded", but pressing the glyph showed pinyin `xī` and meaning
"west, western, westward". Root-caused to two independent data sources feeding
one screen; quantified the full population; fixed the code path and the static
data, and delivered a DB migration for the remaining data defect.

## 1. Root cause

The breakdown screen reads **two different tables**:

| Surface | Source | 覀 |
| --- | --- | --- |
| Tree node label (`useRuntimeCharacterMetadata` → `getDictionaryEntriesBatch`) | `dictionary` | **0 rows → "No meaning recorded"** |
| Press → summary header (`useCharBreakdown` → `getCharacterBreakdown` → static packs + `character_breakdowns_v2`) | `character_breakdowns_v2` | `xī` / "west, western, westward" |

覀 exists in `character_breakdowns_v2` but has **zero rows** in `dictionary`
(verified live). Components that are not standalone dictionary words fall
through the tree's dictionary-only lookup.

## 2. Census (live DB, all 1,815 glyph components reachable in breakdown trees)

| Class | Count | Meaning |
| --- | --- | --- |
| A — breakdown data exists, no dictionary entry | **78** | tree "No meaning recorded", press shows data (覀, 礻, 釒, 耂, 肀, 冎, 叀, 啇, 夲…) |
| B — both exist, pinyin disagrees | **162** (63 tone-only, 99 reading) | tree shows one reading, press another; **91 appear in course vocabulary** (单 Shàn/dān, 区 Ōu/qū, 万 mò/wàn, 无 mó/wú, 那 Nā/nà, 都 Dū/dōu, 过 Guō/guò, 还 Huán/hái, 要 yāo/yào, 行 háng/xíng, 重 chóng/zhòng…) |
| C — both agree | 1,521 | healthy |
| D — dictionary only (no breakdown record/definition) | 17 | tree shows data, press header blank (方, 戈, 惠, 敖, 敝, 择…) |
| E — neither | 37 | consistent "No meaning recorded" (Kangxi radicals ⺀⺈⺊…) |

Why B exists: `dictionary.pinyin_accented` frequently holds the **surname/rare
reading** (单→Shàn, 区→Ōu, 万→mò) with the common reading buried in the
definitions text; `getDictionaryEntriesBatch` also picks the first row via
`data.find` with no ordering.

## 3. Fixes applied

1. **Code — tree now mirrors the pressed screen** (`src/features/character-breakdown/hooks/useRuntimeCharacterMetadata.ts`):
   glyph metadata loads the **breakdown record first** (same source as the
   pressed summary), with the dictionary as fallback for characters without a
   breakdown record. Resolves all 78 A-class cases and all tree-side B-class
   disagreements. Pure precedence logic (`preferCharacterMetadata`) is unit
   tested in `tests/characterBreakdownV3.test.ts`.

2. **Static data — `public/dictionary_trie.json` + dictionary packs were stale
   snapshots** (21,370 rows vs 122,330 live; missing 16 of the top-100 most
   common characters: 了 这 为 来 个 们 国 时 出 里 无 经 种 见 只 没). The trie
   powers instant local dictionary search, word validation and smart-sentence
   segmentation, so this was a real user-facing gap. New
   `scripts/exportDictionaryTrie.ts` (`npm run dictionary:trie`) dumps the live
   table with a common-character coverage check; packs regenerated via
   `npm run dictionary:packs`. Trie is now 122,330 rows (~13.7 MB; brotli at the
   edge), coverage verified.

3. **DB migration — pinyin header corruption**
   (`supabase/migrations/20260826000000_fix_dictionary_pinyin_primary_readings.sql`):
   for single-character rows whose first definition shows the corruption
   signature (`surname / used in / variant of / see`), replace
   `pinyin_accented`/`pinyin_flat` with the breakdown record's reading when they
   genuinely differ. Exactly **205 rows** (verified by simulation): 万→wàn,
   上→shàng, 单→dān, 区→qū, 无→wú, 化→huà, 解→jiě, 血→xuè, 那→nà, 都→dōu,
   过→guò, 还→hái, 曾→céng, 查→chá, 与→yǔ, 为→wèi, 鸟→niǎo, 角→jiǎo, 骨→gǔ,
   提→tí, 汗→hàn, 繁→fán, 观→guān, 肖→xiào, 仇→chóu, 卓→zhuō, 番→fān, 扁→biǎn,
   盖→gài, 绿→lǜ … A blocklist (卜 罗/羅 沈 覃 缪/繆 着) excludes characters where
   the breakdown reading is itself questionable. Apply via Dashboard SQL Editor
   (CLI history is drifted per the 08-24 audit), then re-run
   `npm run dictionary:trie && npm run dictionary:packs`.

## 4. Known remaining issues (curated follow-up)

- `dictionary.pinyin_accented` still holds a **legitimate-but-secondary reading**
  for ~198 more single-char rows (no corruption signature, e.g. 要 yāo, 行 háng,
  重 chóng, 丽 Lí, 页 xié). Bracket annotations in the definitions were
  evaluated as the second pass but rejected: they mark *any* alternative
  reading, and applying them would regress 佛 (fó→fú), 子 (zǐ→zi), 长
  (cháng→zhǎng), 切 (qiē→qiè) and others. The migration's verification SELECT
  lists all remaining mismatches for a human pass.
- The breakdown table itself has internally mixed records for a few
  multi-reading characters (长 zhǎng + "long, lasting", 行 xíng + "professional",
  佛 fú + "Buddha", 子 zi + "son, child").
- 41 breakdown records lack a definition (惠, 戈, 戎, 择, 敖 …); the tree now
  falls back to the dictionary meaning for these.
- `dictionary_trie.json` at 13.7 MB is a large fetch; compression handles it
  today, but a compact/streaming encoding is a future optimization.

## 5. Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (218 tests) | pass |
| eslint on changed files | clean (pre-existing `V3ExampleSentences.tsx` unused-import error unrelated) |
| Trie export | 122,330 rows, duplicate-id check, 100-char coverage check pass |
| Migration row-set simulation | exactly 205 rows, headliner fixes spot-checked |

**Nothing was committed.**
