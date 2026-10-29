# Book 3 grammar redo: plan

Status (2026-10-29): owner said go.
- Step 1 done: transcripts in `materials/book3/LXX/grammar.md`, 98 points. 3 points spot-checked against the scans, all exact. Printed start pages differ from the list below for 甚至 (p.142), 這麼說 (p.188), 怎麼不…反而 and 以上/以下 (one page earlier), and L9 「V得著」 is the printed title. The Codex character cross-check is still to run.
- Step 2 (redone in the app's existing look on request; only the content changes): prototype at https://claude.ai/artifact/YAqTFbARrNnnBWpUJwguvZ, approved.
- Step 3 done: engine per `B3-engine.md`, plus `lead` on order-build, two-part `fill`, and closing marks glued to the previous word in `SmartSentence`.
- Step 4: L1 pilot authored (49 items, 6 points), reviewed, and checked at 390 and 1440. Owner ✓ 2026-10-29.
- Step 5: L2–L5 done 2026-10-29 (L2 55, L3 48, L4 57, L5 52 items; brief `B3-batch.md`). Reviewed and gates green. Engine additions: up to 10 options, and after a right pick the blank shows the finished words (write-in and cue cards). New test: `b3SimplifiedConsistency`. Next: L6–L9.

Files: `content/grammar/b3Lesson*.json`, `content/grammar-practice/b3Lesson*.json`, engine in `src/features/grammar-practice/`.

## What the book does (checked from the scans, 41 of 98 points read fully)

Every Book 3 grammar point prints the same five parts. **There are no tables in any grammar point** (tables appear only in classroom activities, L4 p.118 and L12 p.329).

1. Number + pattern title (e.g. 再……，也/都……).
2. 說明: Chinese explanation, then English. A few compare two words (L12 往往 vs 常常, L16 由於 vs 因為, 使得 vs 使V) or give two senses (L7 才…就, L16 當作).
3. 例句: 3 examples (L7 才…就 has 4). ★ = the line from the lesson dialogue.
4. 練習 1, complete the dialogues, in one of two forms:
   - **Phrase bank:** a–d (sometimes a–f or a–h); ～ stands for the pattern. "Choose to complete; more than one may fit." Usually the last item is "answer yourself".
   - **Fill-in, no bank:** "Use 再……也/都…… to complete the dialogue", 3–4 blanks (L1 V出, L2 早就, L4 four points, L8 three points, L12 這就, L16 於是).
5. 練習 2: "Use X to answer": 2 (sometimes 3) situations ending 你怎麼說?, answered in the learner's own words.

## What the app does now

- 98 points, a flat 4 items each (2–3 in L1–L3), about 372 items. They don't map to the book's items: the book has about 5–6 per point.
- 91% are `slot-build` (one blank, pick a tile from 3). The owner already ruled this too easy for Book 1.
- English prompts are invented ("A confuses similar characters…"), and the phrase banks are missing.
- The 練習 2 situations aren't there as situations.
- The book's English explanation isn't shown (the page holds the Chinese only).
- The pages carry pattern tables; the book doesn't print them, but their rows are the book's examples.

## Proposal

### Page (mirrors the book, in book order)

1. **Title + one-line promise** (keep `learnerPromise`).
2. **說明 (owner, 2026-10-29: English version required):** the book's English explanation is shown first (new field `explanationEnglish`, verbatim from the scan; every point checked so far prints one). The book's Chinese 說明 sits under a 中文 tap. Where the book compares two words, show a small two-column compare card. Where it gives senses (1)/(2), show two tabs.
3. **Keep the existing pattern table** (owner, 2026-10-29: keep the app's familiar look). Its rows are the book's own 例句 split into columns, so nothing is invented. Fix only rows that aren't book examples.
4. ★ example: tap to hear the dialogue recording (clip from `content/dialogueAlignment.json`).

### Exercises (book items first, in order, `source` on each, then own items)

| Book item | App kind | What the learner does |
|---|---|---|
| 練習 1 phrase bank | **`bank-pick` (new)** | The book's a–d cards are shown with ～ filled in by the pattern. Tap the card that completes B's line. Where the book says several fit, every fitting card is accepted and the learner is told "c also works". Each wrong card explains itself. The finished line then plays. |
| 練習 1 fill-in (no bank) | `order-build` (exists) | Build B's reply. Pattern parts are separate tiles (再 · Vs · 也 · …), up to 6 tiles, with one trap tile (都/也 swap, wrong order). The book line is the model answer, and natural variants are listed in `accepted`. |
| 練習 1 "answer yourself" + 練習 2 situations | **`situation-reply` (new)** | The situation card shows the book's Chinese, with an English hint behind a tap. **Step 1:** pick the best of 3 replies: one right, two typical misuses (wrong connector, wrong order, wrong sense). **Step 2:** build that reply from tiles. Easy, but the learner still produces the pattern. |

**More items, +3–4 per point: ON HOLD (owner, 2026-10-29: "for now don't add" them). This round = pages + the book's own items only. The word test below still applies to every item.**
- **From the book's 例句:**
  - `listen-build` on the example's own recording (`content/audio/grammar_track_clips.json`), or on the ★ dialogue clip.
  - `order-build`: rebuild an example sentence from tiles.
  - The sentence stays verbatim from the page.
- **Our own items, made only from taught words:**
  - `spot-fix` for the typical error (可以是 for 可以說是, 再很難).
  - `same-meaning` where the book calls forms equal (可以說是/可說是, 總而言之/總之, 按照/按/照).
  - `match-pairs` for two-clause connectors (既然…就, 不但不…反而, 幸虧…要不然).
  - `sort-groups` for the book's comparisons (往往/常常, 由於/因為).
  - Used only where the kind fits the point.
- **No new words, enforced by a test:**
  - Extend `tests/content/grammarPracticeVocabulary.test.ts` to Book 3.
  - Taught words = all of Book 1 + Book 2, Book 3 vocabulary up to this lesson part, Book 3 grammar examples so far, plus `allowWords` (only words the book prints beside that exercise).
  - Numbers and names are handled by the same rules as Book 1.
  - Today's Book 3 practice fails this badly: about 850 untaught characters, including later-lesson words like 究竟 and 儘管. The rewrite must pass it.

**Result this round:** every book item, in book order: about 5–6 per point (about 550 in total, against 372 now). The extra items come later.

**Scope rules for Book 3:**
- Words: Book 1–2, plus Book 3 up to this lesson part, plus `allowWords` for words the book prints in that exercise.
- Grammar: Book 1–2, plus the Book 3 points taught so far.

The grammar-author rules 1–11 still apply. The one exception is `bank-pick`: it may accept several cards because the book says so.

## Steps

1. **Transcripts (Haiku, vision, cheap):** grammar pages only, L1–L16, written to `materials/book3/LXX/grammar.md`. Each point gets its title, 說明 in Chinese and English, examples with ★, and both exercises verbatim (bank letters, blanks, situations). The scan file is the printed page − 16. Cross-check against the existing OCR. A Codex `gpt-6-luna` pass flags character mismatches, and a human checks those.
2. **Prototype (Claude):** a clickable artifact of two points: L1 可以說是 (bank) and L8 再……也/都 (fill-in + situations). It shows the page, `bank-pick` and `situation-reply`, at 390 and 1440 wide. The owner picks.
3. **Engine** (Claude specs it, Codex implements, Claude reviews against the prototype):
   - New kinds `bank-pick` and `situation-reply`.
   - New page fields: `explanationEnglish`, star/clip on examples, `senses`, `compare`.
   - Validator rules for the new kinds.
   - A Book 3 coverage test: every book item in `grammar.md` maps to one app item by `source`.
   - Update `docs/GRAMMAR_LESSON_TEMPLATE.md` and `docs/WIDGETS.md`.
4. **Pilot L1** (Codex sol-medium authors, then a fresh sol review, then a Claude screen review), then owner ✓.
5. **L2–L16** in batches of 4 lessons, with gates per batch and an owner spot-check per batch.
6. **Verify:** `content:export`, `content:validate`, tests, typecheck, lint. Check screens at 390 and 1440 in Safari and Chrome.

## Acceptance

- Every printed point's page shows the book's Chinese and English 說明 and its examples verbatim, with no invented rows.
- Every printed exercise item exists once, in book order, with `source` (coverage test green).
- The Book 3 vocabulary test is green: no untaught word in any exercise.
- No `slot-build` single-blank item stands in for a book item that asks for a sentence or own answer.
- All gates green; phone and desktop screens checked.

## Open (owner)

- Later, phase 2: an optional "say it your way" typed answer, checked by Jev (`server/jevClient.ts`). Not in this plan.
