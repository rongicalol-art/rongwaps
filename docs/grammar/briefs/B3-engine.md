# Book 3 grammar redo: engine spec (for Codex)

Context: `docs/grammar/briefs/B3-redo.md`. Approved prototype: https://claude.ai/artifact/YAqTFbARrNnnBWpUJwguvZ (screens 1–4). **Keep the app's existing look.** Reuse the current page, table, examples card, chat bubbles, tray, `PracticeChoiceButton` and feedback bar. Only add what is listed here.

Scope: `src/`, `tests/`, `docs/GRAMMAR_LESSON_TEMPLATE.md`. Do **not** edit `content/` or `public/data/`, never read `.env*`, and do not commit.

## 1. Grammar page: the book's English explanation

- `src/types/grammar.ts` → `InteractiveGrammarPage` gains `explanationEnglish?: string` (the book's printed English 說明, verbatim).
- `GrammarLessonExample` gains `fromDialogue?: boolean` (the book's ★).
- `src/screens/grammar-lesson/components/GrammarStudyPage.tsx`, when `explanationEnglish` is set:
  - Show it first, with the same typography as `explanation` today.
  - Under it, a plain accent text button, "Show in Chinese" / "Show in English", swaps in `explanation` (the current Chinese rendering, with focus-term highlighting unchanged).
  - State is local, default English, and resets per page.
  - Pages without `explanationEnglish` render exactly as now.
- In the examples card, an example with `fromDialogue` gets a small accent line under its English: `★ From the dialogue` (text-xs, font-extrabold, brand-primary-text).
- Make sure the content export (`npm run content:export` and the pack loader) carries both new fields through to `public/data/grammar/book-3.json`. Fix the exporter or schema if it drops unknown fields.

## 2. New exercise kind `reply-pick`

Pick the written reply that fits. It serves two book formats:
- 練習1 phrase bank: the book's a–d cards, where ～ stands for the pattern and more than one card may fit.
- Step 1 of a 練習2 situation: pick the best of 3 replies.

Types (`src/types/grammarPractice.ts`):

```ts
/** A situation the book describes (練習2 「你怎麼說？」): Chinese shown, English one tap away. */
export interface PracticeSituation extends PracticeText { english: string }

export interface ReplyOption extends PracticeText {
  pinyin?: string;
  /** Right in this context. Several options may be right (the book says 可以複選). */
  ok?: boolean;
  /** Why a wrong option does not fit (required when not ok). */
  note?: string;
  /** The finished sentence shown after a right pick (required when ok). */
  result?: PracticeSentence;
}

export interface ReplyPickItem extends PracticeItemBase {
  kind: 'reply-pick';
  /** Dialogue context; exactly one `slot` segment marks where the picked option goes (its `answers` are ignored). */
  lines?: PracticeLine[];
  situation?: PracticeSituation;
  /** The pattern that ～ stands for inside option text (e.g. 可以說是). */
  fill?: PracticeTile;
  options: ReplyOption[];
}
```

Add it to the `PracticeItem` union.

**Component:** `src/features/grammar-practice/exercises/ReplyPickExercise.tsx`.
- Show `lines` as chat bubbles (same as slot-build) and/or the `situation` card (§3).
- Options go in the tray as full-width `PracticeChoiceButton`s (as `ListenPickExercise` portals into `trayHost`). A ～ inside the option text renders in `brand-primary-text`.
- Tapping an option puts its text into the slot, with ～ replaced by `fill`, and the slot styled like a filled `InlineBlank`. Tapping another option swaps it. Tapping the slot clears it.
- It uses the normal CHECK bar: add `reply-pick` to the kinds that have Check. Number keys select options.
- Right pick: `onResult({ correct: true, sentence: option.result, note })`. `note` = `This also works: ` + every other ok option's `result.traditional`, joined with a space; omit it when none.
- Wrong pick: `onResult({ correct: false, note: option.note })`. Try again leaves the other options as they were.
- Register the component in `exercises/index.ts`. Wire it in `GrammarPracticeView.tsx` like the other tray kinds, checking `inlineBank`, `needsInstruction` and `hasCheck`.

**Checker:** `checkReplyPick(item, index)` in `src/utils/grammar/grammarPracticePicks.ts` returns `{ correct, note, also: string[] }`. The component uses it, so it stays the one owner of the rule.

**Validator** (`src/utils/grammar/validateGrammarPractice.ts`):
- 2–8 options.
- At least one `ok`.
- Every ok option has a `result`; every non-ok option has a `note`.
- If `fill` is set, every option contains ～ and every `result.traditional` contains `fill.traditional`. If `fill` is not set, no option contains ～.
- The item has `lines` (with exactly one slot across all lines) or `situation`, or both.
- No duplicate option text.

## 3. Situation card, shared by `reply-pick` and `order-build`

- `situation?: PracticeSituation` on `ReplyPickItem` (above) and on `OrderBuildItem`.
- New feature-local component: `src/features/grammar-practice/components/SituationCard.tsx`.
  - The situation's Chinese sits in the same bubble style as `PracticeBubble`, respecting the script setting and the pinyin toggle where text has pinyin.
  - Under it, an accent text button, "Show in English" / "Hide English", reveals `english` in muted bold text.
- `OrderBuildExercise` renders the card above the free line when `situation` is set; nothing else in order-build changes.
- A 練習2 situation is then two items in a row: `reply-pick` (with `situation`, 3 options, one ok), then `order-build` (with the same `situation`, prompt "Now say it yourself.", building the ok reply's pattern clause).

## 4. "No new words" test for Book 3

Extend `tests/content/grammarPracticeVocabulary.test.ts` (both tests) to Book 3:
- Taught words = all Book 1 and Book 2 vocabulary (`public/data/vocabulary/book-1.json`, `book-2.json`), plus Book 3 vocabulary with id order ≤ this page's lesson/part, plus every word in Book 3 grammar examples up to this lesson/part, plus `practice.allowWords`.
- Numerals (〇一二三四五六七八九十百千萬兩) count as taught. The Book 1 vocabulary has no standalone entries for them.
- Apply it only to lessons listed in `const B3_REDONE = new Set([1])`, so the old lessons don't fail before they are redone. Each redone lesson gets added to that set.
- Keep the Book 1 behaviour identical.

## 5. Tests and docs

- Unit tests (`tests/unit/grammarPracticeKinds.test.ts` or beside it) for `checkReplyPick`: a single right pick, two right options (the `also` list), a wrong pick returning its note, and the validator failures listed in §2.
- If `tests/content/grammarPracticeKinds.test.ts` lists kinds, add `reply-pick`.
- `docs/GRAMMAR_LESSON_TEMPLATE.md`:
  - Add a `reply-pick` row to the kinds table: book 練習1 phrase banks and step 1 of 練習2 situations.
  - Add a line on `situation` for order-build.
  - Add a line on `explanationEnglish` / `fromDialogue` for pages.

## Acceptance

- `npm run typecheck && npm run lint && npm test && npm run jev:lint && npm run content:validate` all green, and `npm run content:export` leaves no unexpected diffs in `public/data/`.
- An item fixture renders and works in the DEV practice preview (`GrammarPracticePreview`, if it can take a fixture), matching prototype screens 2 and 4: card pick with "also works", then the situation pick → build.
- Book 1 pages and exercises look and behave exactly as before.
- Report: files changed, and anything you could not do.
