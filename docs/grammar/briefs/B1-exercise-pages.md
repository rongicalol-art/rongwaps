# Book 1 exercise pages: brief

Status (2026-11-01): built. All 16 lessons (76 pages, 338 items) are rewritten as fill-the-blank pages by author agents, each checked by a separate reviewer agent; every picture is an app-style illustration (Codex image generation, checked by hand). Not committed. Open: L16 exercise scans for pp.384/386/388/390 are missing (G02–G05 have own items only); the old practice engine (other kinds, mascot) is unused and can be removed with the owner's OK.

## Goal

Every Book 1 grammar point ends with one calm page that reads like the book: the book's instruction once, then its numbered items in book order. The learner drags (or taps) words into blanks; each item checks itself; Continue sits under the last item. Every item has exactly one right answer decided by its context, never given away, and every wrong word teaches.

## Owner decisions

- One scrolling page per grammar point. Items in book order, then at most 2 own items.
- An item checks itself when its last blank fills. Wrong: red + one-line why, wrong words fly back, one retry. Wrong again: the answer fills in, and the page moves on.
- Chinese only on the page. Pinyin only via the app's pinyin setting. English only after answering (the result sentence). No per-item titles, no `sub`, no glossaries, no mascot, no ghost text.
- Dialogues use plain `A：` / `B：` speakers.
- At least 4 words to choose from in every item. Every wrong word could plausibly go there (same word class, a real learner confusion) and has its own one-line why.
- End: one Continue button. No score.

## Data: `slot-build` only (no new kind)

Book 1 pages use only the existing `slot-build` kind (`src/types/grammarPractice.ts`). Fields used:

```jsonc
{
  "id": "l2g4-1",                       // unique across all files
  "source": "p.60 #1",                  // book item, or "own"
  "kind": "slot-build",
  "scene": { "type": "picture", "page": 56, "box": [0.6, 0.77, 0.26, 0.08], "alt": "A cell phone showing 10:21" },  // optional
  "lines": [
    { "speaker": { "traditional": "A" }, "segments": [{ "type": "text", "traditional": "你有手機嗎？" }] },
    { "speaker": { "traditional": "B" }, "segments": [
      { "type": "slot", "id": "s1", "answers": ["我"] },
      { "type": "slot", "id": "s2", "answers": ["有"] },
      { "type": "slot", "id": "s3", "answers": ["手機"] },
      { "type": "text", "traditional": "。" } ] }
  ],
  "tiles": [ { "traditional": "手機", "pinyin": "shǒujī" }, { "traditional": "沒有", "simplified": "没有", "pinyin": "méiyǒu" }, … ],
  "repairs": [ { "placed": ["不"], "mark": ["不"], "note": "有 is never negated with 不; it takes 沒." } ],
  "fallbackRepair": "Subject, 有, then the thing: 我有手機.",
  "result": { "traditional": "我有手機。", "pinyin": "Wǒ yǒu shǒujī.", "english": "I have a cell phone." },
  "alternatives": [ … ]                 // one sentence per other accepted fill
}
```

Not used on Book 1 pages: `prompt`, `quiet`, `sub`, `glossary`, `gaps`, `successNote`, `me`, and every other kind. Speakers are exactly `A` / `B` (the book's own letters; a named speaker only where the book prints a name).

Pictures (owner 2026-11-01: no hand-drawn SVG scenes; pictures are the book's own or generated illustrations in the app's style, and keep their colours in dark mode):
- `picture`: a book crop (box = left, top, width, height as 0–1 fractions of the scan). If `src/features/grammar-practice/components/generatedPictureAssets.ts` has an illustration for that exact `page:box`, the app shows the illustration; keep that box so the illustration stays.
- `cast`: the book's people row (L1).
- `moment` (a clock time or a date) and `month` (a calendar day): shown only as a generated illustration keyed `moment:10:15`, `moment:7/10`, `month:2019-5:16`. For each one you need that doesn't exist yet, add `PICTURE-NEEDED: <key> — <what it shows>` to your notes; Claude generates it.
- Do not use `change`, `countdown` or `route` (drawn scenes). Use the book's crop or an existing illustration instead, or a `PICTURE-NEEDED` line.
- A scene must decide the answer or be the book's own picture for that item; never decoration.

## Item shapes (all are slot-build)

| Book says | Item |
| --- | --- |
| Complete / fill in / choose X or Y | The book sentence with its blank(s). Tiles: the right word + 3+ plausible wrong ones. |
| Answer the question | `A：` the book's question, `B：` one blank per word of the short answer + a fixed `。`. Context (B's next clause, a picture, a clock) decides yes/no or the value, so exactly one answer fits. |
| Complete the dialogue | Both lines as printed, blanks where the book has them. |
| Rearrange | One blank per book word, all book words as tiles + 1–2 trap tiles (a real confusion, e.g. 不 next to 沒). |
| Describe the picture / rewrite with a pattern | The book's picture or source sentence as context, then a build line for the target pattern. |

## Quality rules (enforced by `tests/content/grammarPracticePages.test.ts` where testable)

1. **Every book item, in book order, nothing dropped.** `source` = `p.<page> #<n>` exactly as printed. Own items (≤2 per page) come after the book items and test a mistake the book items don't.
2. **One right answer, decided by context.** If two fills are grammatical and natural, accept both (`answers` per slot + `alternatives`), or change the context so only one fits. Every accepted combination must be a listed sentence (the test builds every combination).
3. **Not obvious.** ≥4 tiles per item, and ≥ blanks + 1 (a build line always has at least one trap). ≤6 tiles (the validator enforces it). Wrong tiles are the same kind of word as the answer and a confusion learners really make at this point (是/的/有/很, 不/沒, 嗎/呢, 幾/多少, 二/兩, 個/本/張). Never a nonsense filler.
4. **No giveaway.** The full answer never appears in the item's own lines; a tile set never contains only one word that fits grammatically.
5. **Every wrong tile explains itself wherever it lands**: a `placed` repair, or a `slot` repair per wrong slot. One plain-English sentence that names the fix and points at the context ("Look at the picture: he is smiling, so he isn't tired."). `fallbackRepair` covers right words in the wrong order.
6. **Short and clean.** Tiles ≤4 characters. Lines as printed, no pinyin or captions typed into sentences, no line longer than 45 characters.
7. **Taught scope only.** Words from Book 1 vocabulary up to this lesson part, plus the book's grammar examples so far, plus `allowWords` for words printed beside the exercise. Grammar only up to this point in book order.
8. **English** on `result` and every alternative: natural, matches the Chinese exactly.
9. **Simplified forms**: every text segment, tile and sentence whose characters differ in simplified carries `simplified` (the test checks it).

## Mistakes the pilot reviews caught (check every item for these)

- A "wrong" tile that is actually also correct in that blank (來 vs 去 when either works, 很/不 where context doesn't decide). Try every tile in every blank.
- A note that is false for some place the tile can land, or that contradicts the book ("a name takes 叫, not 是" when 我是李中明 is correct). Notes must also be gender-neutral unless the context fixes it.
- The answer printed in the other line (B's reply already contains the words), or an item whose blank count leaves only one grammatical choice.
- An own item that copies a book item or the page's examples, or only tests spelling (她 vs 他).
- Missing `simplified` on line text.

## Engine (Claude)

`src/features/grammar-practice/ExercisePage.tsx` renders a page whose items are all `slot-build`: A2 layout (wider sheet, 26/34px Chinese, blank boxes on the text line, active item in a borderless surface band with its tiles, picture on the right), drag-to-blank + tap-to-next, check via `checkSlotBuild`, result via `slotBuildResult`. `GrammarLessonScreen` uses it for Book 1 pages; other pages keep `GrammarPracticeView` until redone. The mascot goes from Book 1.

## Author procedure (one lesson)

1. Read this brief, then `.claude/skills/grammar-author/SKILL.md` for scope and faithfulness rules (this brief wins where they conflict: slot-build only, no prompt/sub/glossary/gaps).
2. Read `materials/book1/LXX/exercises.json`, `transcript.md`, and LOOK at every exercise scan (`materials/book1/LXX/p<N>.png` or `pages/`).
3. Start from the current `content/grammar-practice/lessonX.json`: keep page keys, `bookPage`, `title`, good sentences, correct crops, accurate pinyin and English. Convert every item.
4. Per item, name the mistake it tests, then make the context decide one answer and pick 3+ wrong tiles learners really confuse at this point.
5. Verify every new or changed picture crop by cropping the scan (python3 + PIL) and looking at it.
6. Gate: `BOOK1_LESSON=lessonX npx tsx --test tests/content/grammarPracticePages.test.ts`. Never run `content:export` while other agents work.
7. Self-review as a learner: could I answer without knowing the grammar? Is a wrong tile also right? Fix.
8. Notes in `docs/grammar/reviews/B1-LXX-pages.md`: per page the book items covered, own items and their mistake, deviations from print and why, crops, unsure points.

## Reviewer procedure (fresh agent, one lesson)

Check every item against the scan and as a learner: book item present and in order; faithful to print; exactly one answer fits (try every tile in every blank); no giveaway (copy, elimination, only one grammatical tile); each wrong tile's note is true and helpful; English and pinyin correct; taught scope; picture crop right. Fix clear problems directly in the lesson file; list taste calls under "Unsure" in the notes file. Run the gate.

## Process

1. Pilot L1 + L2: author agents, then Claude judges on screen and tightens this brief.
2. L3–L16: one author agent per lesson, then a fresh reviewer agent per lesson (book scan vs content, learner's view), fixes, Claude judges every page on screen at 390 and 1440.
3. Gates: `BOOK1_LESSON=<file> npx tsx --test tests/content/grammarPracticePages.test.ts` per lesson; at the end `npm run content:export`, `content:validate`, typecheck, lint, test.
