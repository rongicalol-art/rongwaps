# V2 Memory-Hook Rollout — Handoff

Committed handoff for continuing the Book 1 V2 memory-hook rollout. Read this
first, then the DECISIONS.md entry "2026-09-15 — Memory-hook quality…" (canonical
record, rollout bullets describe every batch).

## Goal / definition of done

Every one of the 656 Book 1 characters ends as one of:

1. a curated V2 hook (hand-drafted, `draft-clean` through the full gate), or
2. a reviewed shape-only frame (like 長/上), or
3. a documented no-hook keeping its v3 hook (atomic characters).

When done: all gates green on the full artifact, the pack exported, DECISIONS
updated, everything committed. The pack is shippable after every batch.

## Current state (certified)

- **325/656 characters ship V2 hooks** (43 batch-47 + 282 in rollout batches 01–06).
- Pack: `public/data/memory-hooks/book-1.json`, manifest `9c78d6b6ae22`.
- Gates: strictHookAudit 0 violations · coverage checker 656 hooks / 0 errors ·
  pack test 5/5 · suite 502/0 · typecheck + lint clean.
- Last commit `7bf71ff` (batch 6). Batch commits: `ff65d3f c0dcb00 4bb21e3
  306b42b 6557995 7bf71ff`, infrastructure `caea732 87e3dbe 1ed904d`.
- Do not touch the parallel-session files in `src/` (uncommitted WIP).

## The per-batch loop (batches of ~47)

```bash
# 0. regenerate the remaining-eligible list (ordered: 2-part first, then 3,4)
node -e "
const generic = require('./output/memory-hooks/book-1-plans.json');
const v3 = require('./output/memory-hooks/book-1-hooks-v3.json');
const merged = new Set(v3.records.filter(r => (r.promptVersion||'').includes('curated-drafts')).map(r => r.character));
const batch47 = new Set(require('./src/data/memoryHooks/book1EvaluationBatch').BOOK_ONE_EVALUATION_BATCH_CHARACTERS);
const remaining = generic.plans.filter(p => p.status === 'eligible').map(p => p.character)
  .filter(c => !merged.has(c) && !batch47.has(c));
console.log(remaining.join(' '));
"
# take the next 47, then:
npm run memory-hooks:prepare:batch -- --batch book-1-v2-rollout-07 --characters "<47 chars>"
# read every frame (target token included), hand-draft the 47 hooks into
# output/memory-hooks/book-1-v2-rollout-07-curated-drafts-v1.json (clone rollout-06's schema:
# character/hook/ahaConnection/describedParts), then iterate:
npm run memory-hooks:validate:batch-drafts -- --batch book-1-v2-rollout-07
# seed empty candidates/validation JSONs (copy the rollout-04 pattern), then:
npm run memory-hooks:apply:batch-drafts -- --batch book-1-v2-rollout-07
npm run memory-hooks:apply:pack -- --batch book-1-v2-rollout-07
npm run memory-hooks:export
# gates:
npx tsx scripts/memory-hooks/strictHookAudit.ts            # 0 violations
npm run memory-hooks:check -- --all                         # 0 errors
npx tsx --test tests/memoryHookPack.test.ts                 # 5/5
npm test && npm run typecheck && npm run lint               # 502/0, clean, clean
# append a DECISIONS bullet for the batch, commit (pack + scripts + DECISIONS).
```

If `prepare` (not `prepare:batch`) ever runs, it RESETS reviewer meanings —
re-apply them immediately with:

```bash
npx tsx scripts/memory-hooks/applyMeaningAudit.ts --apply --characters \
"台 本 英 什 麼 道 嗎 請 喜 號 圖 珍 珠 紹 點 子 啊 題 起 些 顏 件 便 宜 文 個 飲 料 餐 瓶 給 共 錯 吧 位 陽 機 發 游 面 步 息 汽 到"
```

(extend this list whenever a batch adds reviewer overrides — they are also in
`applyMeaningAudit.ts` OVERRIDES, which is the durable copy).

## Quality rubric (hard rules, enforced by the validator)

- Target token `字(label)` exactly once, landing in the last ~4 words.
- Every labeled frame component token `字(label)` exactly once (copy labels
  from the prepared frame output verbatim — they come from the frozen lexicon).
- Glyph-less frame parts: `describedParts: [{ occurrenceIds, description }]`
  and every meaningful word of the description must appear in the hook.
- One sentence, ≤32 words, hook length ≥55 characters (the audit's minimum).
- One listed action verb: rests/leans/calls/sits/stands/opens/holds/marks/
  takes/begs/fills/touches/lies/points/asks/drinks/eats/puts/covers/claims/becomes.
- No filler/template ("make", "combine", "as if", "plus", "forms"), no history
  words ("origin", "ancient", "evolved"…), no "sounds like", no "echoes", no
  "that is a/an", no jargon outside target tokens.
- Articles: "An" before vowel-label tokens (eye, ox, earth, old, evening,
  official, inch…), "A" before consonant labels.
- Sound-note convention for strong phonetics: "mǎ softening to mā",
  "guǒ ripens to kè" style. The nine curriculum phonetics
  (媽 爸 請 客 喝 城 湖 花 問) MUST keep the sanctioned
  "as the sound component (a -> b)" phrasing (shipped-pack test).
- Pack-test characters: 淇's hook must contain "ice cream", 給's must contain
  "give" (both satisfied naturally by the target tokens).
- Spatial accuracy: order the parts as the frame/IDS records them.

## Known traps (learned across six batches)

- **Token labels are exact**: e.g. 反(reverse) not 反(fǎn); 关(frontier pass),
  聿(writing brush), 艮(gèn), 加(add), 宛(wǎn), 合(join), 并(merge) — check the
  frame output each time.
- **Template words inside tokens** ("make", "combine") trip the style gate —
  fix the reviewed label instead (e.g. 做→do, 并→merge recorded in
  `scripts/memory-hooks/book-1-reviewed-component-labels-v1.json`, applied via
  `curate:freeze` → `prepare` → re-apply meanings).
- **Runtime allographs** the checker knows by glyph: 𠂉 ("lying person", e.g.
  午 每 旅), 𠂊 (curated alternatives "claw"/"bent hand", 色), 𠂒 (aliased to
  儿; the pack merge carried it). Describe them with their label words.
- **Coverage checker runs on merged records**: after `apply:pack`, run
  `memory-hooks:check -- --all`; failures are usually a runtime part whose
  reviewed label words are missing from the hook.
- **describedParts word-matching** is substring-with-word-boundary: "offering"
  matches "offerings"; "half" does NOT match "halves".
- **Pilot lexicon wins over curated labels** (component labels): if a frame
  shows a label you did not curate, trust the frame output.
- Every batch so far needed one validate→fix cycle (lengths + articles +
  token exactness) and sometimes one coverage fix (allographs). Budget for it.

## Remaining work (296 eligible + specials + final pass)

1. **296 eligible characters, in the saved order.** Next three slices:
   - batch-07 (47): 臺 亮 茶 幾 沒 書 樂 歲 兩 那 鉛 商 旁 後 具 興 舞 高 從 條 街 市 場 定 舒 線 藍 站 架 裙 牌 因 為 褲 所 貨 難 容 易 胖 瘦 矮 斤 怕 黃 流 短
   - then continue in order (252 are 2-part, 32 are 3-part, 12 are 4-part;
     296 = 6×47 + 14, so batches 07–12 then a final 14).
2. **21 needs-review specials** (小 太 中 介 今 上 也 少 千 桌 戶 山 以 方 司 毛 成 己 十 兔 尺):
   - 上 already ships a reviewed shape-only frame (batch-47); the rest are
     single-part forms. Decide per character: reviewed **shape-only frame**
     (add to `SHAPE_ONLY_CHARACTERS` in `prepareBookOneEvaluationBatch.ts`,
     which now bypasses component-count eligibility) or documented keep-v3.
   - 戶 and 方 are additionally blocked on a canonical meaning decision
     (`missing-canonical-meaning`).
3. **15 no-hook atomics** (人 水 一 心 了 牛 女 力 門 手 又 身 已 母 世):
   documented keep-v3 policy — no action beyond the final DECISIONS note.
4. **Final pass:**
   - `verifyHooks.ts` currently reports ~240 informational `label-variant`
     notes (v3 hooks using old wording: 王 "king" vs curated "jade", 頁 "page"
     vs "head"…). Sweep whichever records remain v3 after the rollout and
     align their wording, or re-document the divergence.
   - Re-run the full gate battery + export, update DECISIONS with the final
     counts and the no-hook/shape-only summary, commit.

## Verification commands (ship readiness)

```bash
npx tsx scripts/memory-hooks/strictHookAudit.ts    # must be 0
npm run memory-hooks:check -- --all                 # must be 0 errors
npx tsx --test tests/memoryHookPack.test.ts         # 5/5
npm test                                            # 502 pass, 0 fail
npm run typecheck && npm run lint                   # clean
```
