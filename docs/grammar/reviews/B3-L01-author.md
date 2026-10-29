# B3-L01 author — GPT-6, 2026-10-29

Verdict: FIXES NEEDED — content gates pass; multi-part phrase-bank preview needs an engine fix outside the permitted files.

## Checked

- Six Chinese/English explanations and all 18 examples match `materials/book3/L01/grammar.md` verbatim; all 18 table rows reconstruct complete examples. Each first example has `fromDialogue: true`.
- Doubtful wording checked against scans pp.29–31, 33, 38, 40–42. Dialogue data, page identities, focus terms, audio references and other existing page fields retained.
- All 31 printed tasks covered in book order; no `own` items. Each open bank-group reply and each situation has pick → build. V出 練習1 #1 has separate A/B builds because both speakers have a blank.
- Every bank is verbatim, including ～; correct options have full reply/pinyin/English, wrong options have individual repairs. Every trap tile has a `placed` repair. All tiles meet the six-tile/four-character limits.
- Printed vocabulary allowances only; removed untaught invented 塞車/反對 from authored replies. The vocabulary gate passes.
- Natural alternatives: reversed independent reasons for 再說; 想出/想出了 for the story reply. Printed trailing text in V出 #1–3 stays visible in `sub`; feedback preserves the full completed source frame.

| Point | Book tasks | reply-pick | order-build | Total |
| --- | ---: | ---: | ---: | ---: |
| 可以說是 | 5 | 5 | 3 | 8 |
| 多（麼）Vs 啊 | 5 | 5 | 3 | 8 |
| 再說 | 5 | 5 | 3 | 8 |
| 因為…而 | 5 | 5 | 3 | 8 |
| V出O | 6 | 2 | 7 | 9 |
| 就算…也 | 5 | 5 | 3 | 8 |
| Total | 31 | 27 | 22 | 49 |

## Issues

- `content/grammar/b3LessonOne.json` — restored missing/altered source examples, both explanation languages, dialogue stars and complete example-based table rows.
- `content/grammar-practice/b3LessonOne.json` — replaced all previous items with the book's dialogues, banks and situations; no extra exercises.
- Export PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts`.
- Validation PASS: `node --import tsx/esm scripts/content/validateLessons.ts` → `Interactive lesson content valid.`
- Content/checker tests PASS: `node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts` → 252 tests, 252 pass, 0 fail.
- Full npm-test equivalent: `ACCEPTANCE_STRICT=true node --import tsx/esm --test tests/*.test.ts tests/unit/*.test.ts tests/content/*.test.ts tests/pipeline/*.test.ts` → 1,289 tests, 1,285 pass, four socket-only failures (ignored as instructed). Exact failing output below.
- The requested npm entry points were attempted; the `tsx` CLI itself cannot create its IPC socket in this sandbox. Node's `tsx` loader runs the same entry points without that CLI socket. No tests or gates were weakened.
- Source audit PASS: six bilingual explanations, 18 examples, 18 complete table rows, six dialogue stars, 12 verbatim situations each present in both steps.
- Generated pack changes were temporary for verification and restored afterward to respect the three-file limit. No commit.

## Unsure

- 再說 練習1 #1: accepted cards b and d. Card b presumes the event provides food without further spending; that is suggested by its wording but not stated explicitly in A's line.
- 多麼 練習1 #1: only d fits the printed start 能遇到. Card b (大家～幸運～！) is semantically related but cannot directly follow that printed start; rejected without rewriting either source string.
- Grammar scans do not print pinyin for these sentences. Readings are authored using existing course readings and context; they are not claimed as scan-verified pinyin.

## NEEDS-ENGINE

- NEEDS-ENGINE: six phrase-bank items (G2/G4/G6 練習1 #1–2) contain different pattern parts at successive ～ markers. `ReplyPickExercise.tsx` currently uses `.replaceAll('～', fill.traditional)`, yielding e.g. 風景多麼美麗多麼 or 因為網路推薦因為變得很有名. The supplied `fill` names the first pattern part; the correct full feedback sentences expand every part correctly. Preserve the printed cards and add per-marker pattern expansion in the engine. No content-only representation in the current type can express 多麼/啊, 因為/而, or 就算/也 while keeping the bank verbatim. Do not ship these six previews as fully correct merely because validation passes.

### npm CLI sandbox failure (exact validation output)

```

> rongwaps@0.0.0 content:validate
> tsx scripts/content/validateLessons.ts

node:net:1986
      const error = new UVExceptionWithHostPort(rval, 'listen', address, port);
                    ^

Error: listen EPERM: operation not permitted /var/folders/qg/f3wbjh910sd4_9qq450fj7nr0000gn/T/tsx-501/96662.pipe
    at Server.setupListenHandle [as _listen2] (node:net:1986:21)
    at listenInCluster (node:net:2065:12)
    at Server.listen (node:net:2187:5)
    at file:///Users/ronianb.gica/Projects/rongwaps/node_modules/tsx/dist/cli.mjs:53:31472
    at new Promise (<anonymous>)
    at createIpcServer (file:///Users/ronianb.gica/Projects/rongwaps/node_modules/tsx/dist/cli.mjs:53:31450)
    at async file:///Users/ronianb.gica/Projects/rongwaps/node_modules/tsx/dist/cli.mjs:55:500 {
  code: 'EPERM',
  errno: -1,
  syscall: 'listen',
  address: '/var/folders/qg/f3wbjh910sd4_9qq450fj7nr0000gn/T/tsx-501/96662.pipe',
  port: -1
}

Node.js v26.0.0
```

### Full-suite failures (exact output)

```
test at tests/unit/dictionaryServer.test.ts:1:438
✖ dictionary API authenticates, bounds requests, serves small results and keeps HTTP responsive (2438.918292ms)
  Error: listen EPERM: operation not permitted 127.0.0.1
      at Server.setupListenHandle [as _listen2] (node:net:1986:21)
      at listenInCluster (node:net:2065:12)
      at node:net:2274:7
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    code: 'EPERM',
    errno: -1,
    syscall: 'listen',
    address: '127.0.0.1'
  }

test at tests/unit/feedback.test.ts:1:905
✖ Feedback saves before notifying; save failure, retry, and notification outage remain safe (11.957917ms)
  Error: listen EPERM: operation not permitted 127.0.0.1
      at Server.setupListenHandle [as _listen2] (node:net:1986:21)
      at listenInCluster (node:net:2065:12)
      at node:net:2274:7
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    code: 'EPERM',
    errno: -1,
    syscall: 'listen',
    address: '127.0.0.1'
  }

test at tests/unit/ttsServer.test.ts:1:2878
✖ retired grading API returns 404 without contacting auth or grading providers (10.110875ms)
  Error: listen EPERM: operation not permitted 127.0.0.1
      at Server.setupListenHandle [as _listen2] (node:net:1986:21)
      at listenInCluster (node:net:2065:12)
      at node:net:2274:7
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    code: 'EPERM',
    errno: -1,
    syscall: 'listen',
    address: '127.0.0.1'
  }

test at tests/unit/ttsServer.test.ts:1:3991
✖ 150 cold student accounts behind one campus IP reach authentication without sharing a user quota (11.973458ms)
  Error: listen EPERM: operation not permitted 127.0.0.1
      at Server.setupListenHandle [as _listen2] (node:net:1986:21)
      at listenInCluster (node:net:2065:12)
      at node:net:2274:7
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    code: 'EPERM',
    errno: -1,
    syscall: 'listen',
    address: '127.0.0.1'
  }
```

## Claude review (2026-10-29): fix before the owner sees it

Engine: two-part fills are done. `fill` may be a list (多麼/啊, 因為/而, 就算/也), and the nth ～ takes the nth part. L1 G2/G4/G6 are updated.

1. **Simplified text is wrong in 48+ places.** 是 is written as 事 (可以说事), and that may not be the only wrong character. Re-derive every `simplified` from its `traditional`, character by character. Then self-check with a script that each traditional character maps to one consistent simplified character across both L1 files. List any genuine one-to-many cases.
2. **Wrong replies in `reply-pick` (open answers and situations) are lazy.** Nearly every one is "drop 是" or "swap 說/是", repeated in every item. Each wrong reply must be a real, different misuse that a learner might pick, and must not repeat a mistake another item in the same point already tests. For example: 可以是 ("can be"), 可能是 (a guess, not a summing up), 可以說是 used before a verb phrase where it doesn't fit, or the right pattern in the wrong situation. Same for G2–G6.
3. **`order-build` gives the answer away.** A whole-pattern tile (可以說是) next to a near-copy (可以說) means you just pick the longer tile. Split the pattern into its parts (可以 · 說 · 是, or as each point needs), so the learner builds it. Use one trap that is a real alternative from the scope (可能, 應該, 會…), not the trap the pick step just tested. Keep the 6-tile and 4-character limits. Same for G2–G6.
4. Keep everything else as is. It is faithful to the book.

## Fixes applied (2026-10-29)

- Simplified: re-derived every existing `simplified` field in both L1 files; corrected 77 fields whose traditional text stayed unchanged (33 reference, 44 practice), plus regenerated text for revised replies/tiles. Restored the shortened reading and fixed 是/事, 賢, 慶, 厲 and other incomplete conversions. Character-pair audit across both files passes with only two genuine context-dependent mappings: 畫 → 划 in 計畫/計畫書, otherwise 画; 著 → 著 in 著名, otherwise 着. 妳 consistently becomes 你; 網路 becomes 网路 without a regional vocabulary substitution.
- Wrong replies: audited all 34 authored distractors across 17 picks; revised 26 and retained eight distinct mistakes. Each point now tests different errors in form, word order, meaning or situation, with individual repairs; printed phrase-bank cards remain verbatim.
- Builds: audited all 22; revised seven docks (three split 可以 · 說 · 是 builds and four traps duplicated in the preceding pick). The three G1 subjects stay visible in `lead` to fit five answer tiles plus one trap. All docks meet six-tile/four-character limits; canonical sentences and accepted alternatives stay unchanged. The other 15 builds already separate the pattern parts and use a different trap from their paired pick.
- Preserved all 49 items, printed contexts, source order, correct replies and existing multi-part `fill` arrays. Reference-file changes are exclusively `simplified` fields.
- PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts && node --import tsx/esm scripts/content/validateLessons.ts && node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts` — validation valid; 259 tests, 259 pass, zero failures. `git checkout public/data` was attempted but blocked by sandbox denial of `.git/index.lock`; restored the generated files byte-for-byte from `git show HEAD:<path>` instead, and verified no `public/data` diff remains. No commit.

## Claude review 2: tables (screen check at 390 wide)

The tables put whole example sentences into the cells (你演的戲我都看了我 | 可以說是 | 你的戲迷喔快幫我簽個名吧), which wrap a character at a time on a phone. The brief's "every row is a 例句 split into columns" was too literal. New rule:

- **A row is the core clause of a book example, not the whole sentence.**
  - Drop the lead-in context and the trailing extra clause.
  - Keep only the words that show the pattern: 我 | 可以說是 | 你的戲迷; 他 | 可以說是 | 一個大人了; 這裡 | 可說是 | 我第二個家.
  - Every word in a row still comes from that example, in order. Nothing is invented.
- **Columns follow every part of the pattern**, with each pattern word in its own accent column:
  - 因為…而: Subject | 因為 | Cause | 而 | Result.
  - 就算…也: 就算 | Condition | Subject | 也 | Result.
  - 多（麼）…啊: Subject | 多(麼) | Adjective | 啊.
  - V出: Subject | Verb | 出 | Object.
  - 再說: Reason 1 | 再說 | Reason 2.
  - Set `patternAccentColumn` and column labels to match.
- **Short cells.** Aim for ≤6 characters per cell, with no punctuation inside cells. Where an example's core clause still can't be short (再說 reasons), pick the shortest faithful core.
- **The full sentences stay in the Examples card.** Do not link rows to examples (`exampleId`), so all 3 examples, with ★ and audio, show in the card.

## Tables fixed

- Updated only `patternColumns`, `patternAccentColumn` and `patternRows`; no `patternColumnDetails` fields were present. Six page records, one copy per page. Full Examples cards, dialogue stars, audio references and all other fields remain unchanged.
- Every row token has traditional, simplified, pinyin and a short English meaning. Cells contain no punctuation; rows have no `exampleId`. Omitted subjects stay empty rather than moving words across 就算. A few seven/eight-character cells retain the essential object or duration.

### B3L01-G01-P29

| Subject | 可以說是 | Explanation |
| --- | --- | --- |
| 我 | 可以說是 | 你的戲迷 |
| 他 | 可以說是 | 一個大人了 |
| 這裡 | 可說是 | 我第二個家 |

### B3L01-G02-P30

| Subject | 多（麼） | Adjective | 啊 |
| --- | --- | --- | --- |
| 不當演員 | 多麼 | 可惜 | 啊 |
| 那隻狗 | 多 | 可愛 | 啊 |
| 我 | 多 | 舒服 | 啊 |

### B3L01-G03-P32

| Reason 1 | 再說 | Reason 2 |
| --- | --- | --- |
| 你長得好看 | 再說 | 觀眾肯定你的表現 |
| 得交兩個報告 | 再說 | 快期末考了 |
| 交到不少朋友 | 再說 | 更了解自己 |

### B3L01-G04-P38

| Subject | 因為 | Cause | 而 | Result |
| --- | --- | --- | --- | --- |
| 一些導演 | 因為 | 拍出了好電影 | 而 | 變得很有名 |
| 他 | 因為 | 不適應都市生活 | 而 | 搬到了鄉下 |
| 他 | 因為 | 喝酒開車 | 而 | 丟了工作 |

### B3L01-G05-P40

| Subject | Verb | 出 | Object |
| --- | --- | --- | --- |
| 一些導演 | 拍 | 出了 | 好電影 |
| 他 | 寫 | 出了 | 一本小說 |
| 我 | 做不 | 出 | 滿意的蛋糕 |

### B3L01-G06-P42

| 就算 | Condition | Subject | 也 | Result |
| --- | --- | --- | --- | --- |
| 就算 | 累得不得了 | 東賢 | 也 | 覺得很開心 |
| 就算 | 工作十二個小時 | — | 也 | 沒問題 |
| 就算 | 二十年不吃不喝 | — | 也 | 買不起 |

- Export PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts`.
- Validation PASS: `node --import tsx/esm scripts/content/validateLessons.ts` → `Interactive lesson content valid.`
- Content tests PASS: `node --import tsx/esm --test tests/content/*.test.ts` → 246 tests, 246 pass, zero failures.
- Scope/source audit PASS: only permitted table fields changed; all retained characters occur in their source example in order; all row word fields are nonempty; no row links hide examples.
- Generated packs restored byte-for-byte to their pre-task state after verification, preserving existing work. No commit.
