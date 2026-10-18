# Grammar Lesson Template

Interactive grammar lessons use a linear part flow that hands off to the part's reading:

`Grammar 1 -> Grammar 2 -> … -> Reading -> next Part's Grammar 1 -> …`

Source Reading content remains stored on the part for a later feature, but it is not rendered or required for completion unless that part already has a dedicated Reading experience. Each grammar step ends with one primary `Continue` action; a quiet `Back` appears after the first grammar. Continue marks the current grammar complete and advances to the next point; the final Continue marks the Part complete and opens that part's reading. There is no separate completion screen. A page with a book exercise (`practice`, see [Book exercises](#book-exercises-practice)) shows `Practice` instead: the exercise opens in the same window and the page completes when it is done. The older per-page `questions` data stays authored but is not mounted. Reopening a part resumes at the first incomplete grammar.

Keyboard: `←`/`→` move between the part's grammar points (the last page's `→` opens the part's reading), `Shift + ←/→` (or `[`/`]`) open the previous/next grammar part in book order without leaving the window, and `Esc` closes. In the reader, the gestures are path steps: the next stroke (`→` or swipe) opens the next part's grammar while a next part exists, and the previous stroke returns into this reading's part grammar at its last page; readings that belong to no part (essays) have no step either way. The screen and interaction logic live under `src/screens/grammar-lesson/`. Book-specific content lives in `src/data/grammar/` and is registered in `src/data/interactiveGrammarPages.ts`. A part conforms to `InteractiveGrammarPart`; each grammar point inside it conforms to `InteractiveGrammarPage`.

## Part content contract

Each reading-centered part provides:

- Book, lesson, part, and source Reading identity
- An ordered list of grammar pages associated with that Reading
- One shared Reading in its native format, with grammar-focus words and an appropriate comprehension check
- Part-completion copy and the next book destination

The Reading remains stored once for future use. Grammar points belonging to the same source Reading must not create duplicate curriculum parts.

## Page content contract

Each grammar page inside a part provides:

- Book, lesson, part, grammar number, printed pages, and audio reference
- Traditional title, English title, a concrete learner promise, and textbook-based explanation
- Three pattern-column labels and one or more pattern rows. Labels use the standardized grammar term when the slot has one (`Subject`, `Verb`, `Object`, `Noun`, `Adjective`, `Number`, `Measure word`, `Statement`) and the canonical slot vocabulary (`Time`, `Place`, `Result`, `Condition`, `Tool`, `Receiver`, `Focus`, …) when the role has no standard term; they read as plain 1–3 word titles, stay within 6 visual-width units (≈ 6 CJK glyphs or ~13 Latin characters) so they never wrap in the narrowest mobile column, and keep particle labels (`嗎`, `有 / 沒有`, `一……就……`) where the slot *is* the particle. Full nuance belongs in the page `explanation` or the short `patternColumnDetails` notation (≤ 8 units) that rides in the cell tooltip, never in a compound, abbreviated, or parenthetical header such as "Suggested or permitted action", "Name / ID", or "(no noun)"; `validateInteractiveLessons` fails a label that is too wide, more than three words, or wrapped in parentheses.
- A `confusion` block of don't-mix-these-up clarifiers (see below)
- A discovery interaction when comparison, repair, or meaning choice makes the rule easier to notice
- Segmented examples with pinyin, English translations, and dictionary meanings (a reference page such as the number system may ship no example cards when its full pattern table plus number lab already carry every reading — the printed book prints no numbered examples there)
- Data-driven exercise title, preview, instruction, optional note, and questions
- Optional profile cards or book exercise cues

Every Chinese teaching term, example segment, prompt, blank answer, and answer tile must expose a dictionary action. Lesson-authored contextual pinyin and meaning take priority over a generic dictionary gloss.

Grammar progress is stored per grammar page. Part progress is stored separately and currently becomes complete after every grammar page has been continued through.

## Book exercises (Practice)

The book's own exercise for a grammar page, answered by tapping (never typing or self-checking). Authored per lesson in `content/grammar-practice/lessonX.json`, keyed by grammar page id; `npm run content:export` merges each one onto its page in the grammar pack. Engine: `src/features/grammar-practice/`; answer checks: `src/utils/grammar/grammarPractice{Check,Sequence,Picks}.ts`; types: `src/types/grammarPractice.ts`.

Flow: page → `Practice` → items one at a time → the next page (or the part's reading). The screen is one centred column (the flashcard quiz width): the book's instruction as title, the picture if there is one, then the sentence or chat. The word bank lives in the bottom dock: tap a word and it moves onto its blank, which is an underline in the sentence; a placed word reads as normal sentence text (tap it to send it back). Dock tiles show characters only (pinyin is in the result). With no words left to place, the dock is just its one full-width button. That button is Skip until the answer is complete, then Check; after Check the same dock turns green or red with the sentence, pinyin and English, or the fix, and Continue / Try again (wrong words go back, right ones stay). Nothing is recorded until the exercise is done. `←` returns to the page; `→` never skips an exercise. Motion is limited to words moving between the dock and their blank, and the route line drawing in on a right answer.

Kinds (each lesson mixes them to fit its book page):

| Kind | Use for | Book example |
| --- | --- | --- |
| `slot-build` | Fill blanks from the dock. Optional `scene` (`route` map with flags or place icons, `change` before → now, or `countdown`: a calendar day or clock time now → next, with the gap shown). When several fills are right, each one needs its sentence in `result` or `alternatives`, so the feedback shows what the learner built. Lines with a `speaker` render as a chat; the learner's line has `me: true` (blue bubble); `glossary` shows under the last line before the reply, where the book prints it. `gaps: true` = place the word: one tile, every slot is a gap between words, only one slot lists it, and each other gap needs a `slot` repair | L1 p.40 #1 (嗎); L7 p.163 describe the pictures; p.166 weather, prices, teacher dialogue |
| `slot-reels` | Retired: the validator rejects it (it allows several answers); author `slot-build` instead | — |
| `chat-build` | "Rearrange the sentences" as a chat turn: the friend writes, your reply shows one underline per word and fills in tap order; exactly one accepted order | L7 p.164 |
| `order-build` | **Build the sentence.** The title says what to say; loose words go onto one free line with no blanks, so the line never shows how many words are right. `accepted` lists every grammatical order (each with its sentence); a `placed` repair per wrong tile, `before` / `notFirst` / `notLast` repairs for order mistakes, a `fallbackRepair`. A pattern that doubles a word (又…又) repeats that tile | own: L1 不是 + nationality; L5 你在哪裡看書; L7 又大又舒服 |
| `listen-build` | **Listen, then build.** The learner hears one clause or sentence of a book dialogue (the real recording, never text-to-speech) and builds what was said on the same free line as `order-build`. The title is the task ("Build what you hear.") and neither it nor `sub` may show Chinese; nothing Chinese shows until the answer is checked, then its text, pinyin and English. `clip` = `{ reading, line, file, start, end }`: the dialogue (reading id) and line index in `content/dialogueAlignment.json`, its track, and the seconds to play. `accepted` has exactly one order (what was said); tiles, `placed` / `before` / `notFirst` / `notLast` repairs and `fallbackRepair` are as in `order-build`. A wrong tile should sound like the right one or be its opposite (早上 / 下午, 有 / 沒有, 上面 / 下面, 坐捷運 / 走路, 因為 / 所以), with `title: "That is not what you heard"` on its repair; a fallback says what to listen for, not the answer | own: L1 她很漂亮; L2 我早上沒有課; L3 妳想送她什麼; L5 錢包在我的書下面; L7 坐捷運去都可以; L8 所以我不常買 |
| `spot-fix` | **Spot the mistake.** A friend's written sentence (`chunks`, `tail` keeps punctuation) means what `sub` says; tap the wrong word (`wrong`), then pick its fix from the dock: `tiles` (each wrong one explained by a `placed` repair) plus "Take it out", which is always offered so it never hints at an extra word. `fix` is the right tile, or leave it out when the fix is taking the word out (a swap also needs `takeOutNote`). `hint` is said when a fine word is tapped and must not name the wrong word; the validator checks `result` equals the sentence with the fix applied | own: L1 他是姓李 (是 + 姓); 你喜歡誰嗎; L4 和 joining two verbs; L6 有點兒 with praise |
| `match-pairs` | **Match the pair.** 3–4 `lines` on the left, `replies` on the right (each reply has `answers`: the line's index). Tap one of each; the pair is checked at once, a right pair turns green with its number on both cards, a wrong one says what the line needs. At least one trap reply (no `answers`, with a `note`) so the last pair is never forced. Use it only when logic decides, not a shared keyword | own: L8 因為 reasons ↔ 所以 results |
| `sort-groups` | **Sort by use.** 4–6 sentences, two `groups`; the dock holds the two groups, each tap sorts the current sentence and the next one arrives; a wrong tap says why the sentence belongs to the other group (`note`). For one word with two jobs; keep punctuation from giving the group away | own: L6 可以 permission / suggestion; L8 吧 suggestion / guess |
| `story-order` | **Story order.** 3–5 short sentences (`steps`, shown as given, each with a `note` on why it sits where it does); tap them in order, each takes the next number (tap again to take back); `answer` lists the step indexes in the right order. The order must come from connectors or time words, not common sense alone | own: L1 chat with 你呢; L2 a school day by the clock |

Every item has exactly ONE right answer (the validator counts `slot-build` solutions and `chat-build` accepted orders; `order-build` lists more than one only where the grammar really allows it, e.g. 又大又舒服 / 又舒服又大; `listen-build` always lists one: what was said) and a `source`: the book item (`"p.81 #3"`) or `"own"`.

### Where each kind goes

Pick the kind from what the learner must notice, never to vary for its own sake. The book's items come first and stay as they are; the new kinds are mostly **own items** (1–3 per point, after the book's), and each tests something the group's other items don't.

- **Word order is the grammar** (time + action, 在 + place + verb, 從…到…來/去, V得, 比, 又…又): `order-build`, once the book items have taught the pattern with blanks. Question words stay in place (你在哪裡看書), so asking is a good target. List every grammatical order in `accepted` (time words may also lead the sentence), and add one tempting wrong tile with a `placed` repair.
- **A mistake learners really make** (是 before an adjective or 姓, 嗎 beside a question word, 和 between verbs, 有點兒 for praise, 不有, 一個 for a book): `spot-fix`. The mistake must be real Chinese-learner error, the `sub` fixes the meaning so only one repair is right, and a missing word becomes a swap (三 → 三個).
- **Logic links two lines** (因為 → 所以, if → then, request → answer): `match-pairs`. Skip it when the lines share the grammar word (從 … 從) because that only tests keywords.
- **One word, two jobs** (可以 permission / idea, 吧 suggestion / guess, 了 change / done, 會 skill / will, 在 verb / preposition, 對 verb / preposition): `sort-groups`, put after both jobs are taught.
- **Connectors or time words decide the sequence** (time of day L2, 先…再 L9, 一…就 L13, 本來…後來 L16, a 你呢 chat L1): `story-order`.
- **Hearing the word is the skill** (a word that sounds like another, an opposite, a word the ear drops: 沒 in 沒有, 吧 at the end, 所以 vs 因為): `listen-build`, own items after the book's, from a dialogue of the same lesson part. Pick a clause the grammar page is about, so the order the learner builds is the pattern. It plays the book's own recording only, so there are no sentence files to host: a `clip` is a time range of the dialogue track (`audioService.playRange`, the reader's path).

Cutting a clip (never change `content/dialogueAlignment.json` or the audio for it; ask first):

1. Choose one clause or sentence of at most ~3 s of speech from a line in `content/dialogueAlignment.json` (every `chars[]` entry gives a character's onset `start` and match `score`; `unmatched` lines are never used). The recordings put digital silence of about a second between clauses, so a clause is one run of sound with room around it.
2. `start` = the first character's `start` − 0.12 s; `end` = the last character's `start` + its sound + about 0.25 s. Never cut inside speech, and keep the clip at least 0.6 s after the previous word's start and 0.3 s before the next word's, because the player seeks to the nearest frame and can run a little past `end` (clauses joined by a short pause, like an enumeration, do not leave that room: pick another).
   Prefer clauses from the narrator readings (-R03) or quieter takes when the choice is equal: the two-speaker dialogue tracks are mastered hot and clip more.
3. `tests/content/grammarPracticeKinds.test.ts` proves it: every character that begins inside the clip, in any line of that dialogue, spells exactly the answer, from one line, each matching the recording at 0.85 or better, with the margins above. Run `npm run content:export`, then the tests.

Planned for the lessons that have no practice yet (author after the book items, same rules):

| Lesson | Points | Kinds that fit |
| --- | --- | --- |
| L9 | 比較, 能 / 可以 / 會, 先…再, 從…到 | `story-order` (先…再), `sort-groups` (能 / 可以 / 會), `order-build` (從…到 times) |
| L10 | 如果…就, 和…一起 / 對 / 向, 多 / 少 | `match-pairs` (if → then), `sort-groups` (和 / 對 / 向), `spot-fix` |
| L11 | 先…等…再, 沒 / 還沒, 是…的, V了 | `story-order` (先…等…再), `spot-fix` (沒 vs 還沒), `sort-groups` |
| L12 | 的時候, 過 / 了, 用, 以前 / 以後 | `sort-groups` (過 vs 了), `order-build` (用 + tool + action), `spot-fix` |
| L13 | duration, 就要 / 快要, 就, 往 | `story-order` (一…就), `order-build` (從…往…), `spot-fix` (duration after the verb) |
| L14 | V了 + duration (了), 比 | `order-build` (A 比 B), `spot-fix` (A 比 B 很…), `sort-groups` (finished vs still going) |
| L15 | 跟…一樣, 著, 一…就 | `order-build` (跟…一樣), `sort-groups` (著: state vs action), `story-order` |
| L16 | 離, 本來…後來, 更, V得 degree | `match-pairs` / `story-order` (本來 → 後來), `order-build` (離), `spot-fix` (更 vs 很) |

More `scene` types: `moment` (`{ moment }`: one calendar day or clock time with its caption), `month` (`{ year, month, highlight: [days] }`: the book's month calendar, weekday of day 1 computed), `picture` (`{ page, box: [left, top, width, height], alt }`: a crop of the printed Book 1 page, box as 0–1 fractions of the page), `cast` (`{ page, alt, people: [{ box, name, pinyin, note }] }`: several pictures side by side with their printed name and nationality, for exercises that need all of them to answer, e.g. L1 p.38).

Pattern rows: `exampleId` on a `patternRows` entry shows that page example directly under the row (same item and audio button as the examples list), and the list then skips it.

Content rules:

- Follow the printed exercise: its instruction (`title`), its pictures (`scene`), its sentences and chunks. Split a long line into two messages at its comma rather than let it break mid-word.
- Use only words taught up to the lesson: Book 1 vocabulary through that lesson plus words in earlier grammar pages. A word the book prints beside the exercise (e.g. 懂 on p.166) goes in `allowWords`. `tests/content/grammarPracticeVocabulary.test.ts` fails on anything else.
- No ambiguous keys: a "wrong" tile must really be wrong in context (add context such as "You're at home", or drop the option).
- Every repair note is one plain-English sentence that names the fix.

Workflow: edit the lesson's practice JSON → `npm run content:export` → `npm run content:validate` → `npm test` (answer keys, repairs, vocabulary) → try it in DEV: Ctrl+Shift+0 → UI Previews → Grammar practice (no progress is recorded). A new kind = its item type, its check (`grammarPracticeCheck`, `grammarPracticeSequence` for order, `grammarPracticePicks` for choosing), its structural rules in `validateGrammarPractice.ts`, a component in `exercises/`, a line in `exercises/index.ts`, and a test.

How the new kinds feel: `order-build`, `spot-fix` and `story-order` use the same dock as the rest (Skip → Check → result, Try again clears the order; `spot-fix` keeps a right word lifted). `match-pairs` and `sort-groups` check as you tap, so they have no Check: a wrong tap turns the dock red with the reason, and Try again frees it. Sentences in `match-pairs`, `sort-groups` and `story-order` show pinyin and English under the Chinese only when those settings are on. `glossary` is not shown by the new kinds: use taught words only.

`listen-build` is the `order-build` line with one big speaker button above it (`ClipButton`). The clip plays once as the item opens when auto-play audio is on (the quiz's setting; a browser that blocks it leaves the button for a tap) and again on every tap, also after Check; the button pulses while it plays. Skip or Continue stops it. If the recording cannot play, a one-line note under the button says so and a tap tries again (Skip is always there); text-to-speech is never used. The English translation setting is ignored here: the translation shows with the answer.

## Supported exercise templates

### Profile blanks

Use `profiles` when learners must infer names, surnames, or countries from character profiles. Questions remain tap-or-drag blank sentences.

### Book-cue choices

Use `exerciseCues` when the printed exercise depends on an illustration. Each cue records the exact pedagogical information conveyed by the source image without inventing missing content. Questions use a small repeated choice set such as 很／不.

Both templates use the same `GrammarExerciseQuestion` and `GrammarExerciseSegment` model, answer checking, repair feedback, and completion transition.

### Conversation contrasts

Use the optional `contrast` block when learners must distinguish two easily confused forms before practicing. Prefer a drag-and-tap comparison workshop when each choice changes the sentence's conversational job: reusable choice tiles, explicit sentence drop zones, immediate meaning or repair feedback, and a two-direction quick test after exploration. These checks teach before Practice and never count toward grammar or part completion.

Lesson 1 Part 2 uses this recipe to distinguish a new yes/no question with `嗎` from returning an established question with `呢`.

### Responsive pattern presentation

Keep one adaptive syntax-table structure on every viewport. The slot header (`patternColumns` labels only — one 1–3 word title per cell; the compact `patternColumnDetails` notation rides in the cell tooltip) is a separate tinted band at the top of the table, never merged into an example row; its headings are sentence-case bold, left-aligned, stay on a single line, and render any Chinese glyphs in the learner's character font (sans / kai / rounded) just like the cells. All rows live together in one quiet table surface — a single shared CSS grid — with a brand-tinted outline and internal dividers; do not create separate bordered cards or gaps between examples. Column tracks are sized from the longest visible traditional/simplified content, attached punctuation, pinyin, inline `(meaning)` gloss, and slot heading, and the grid is capped by a centered `max-w`. On narrow viewports a single flexible `1fr` track absorbs leftover space and its neighbors hug their content (`min-content`), so a one-character slot never stretches; from 768px tracks spread by content weight with content-based minimums (`minmax(auto, share fr)`), so the table fills its card proportionally without one column ballooning past its content. The table surface always contains horizontal overflow by scrolling rather than clipping. Do not author layout modes (`patternMobileLayout` was removed); globally unused columns are omitted, while a row that lacks a group preserves that column position as an empty cell. Cell text wraps within the table when needed; never render separate desktop/mobile markup. If an unusually wide pattern requires five or more columns, contain horizontal overflow to the table surface only. The English meaning is a full-width translation row directly beneath its Chinese row inside the same table when the English-meaning setting is on; pinyin renders under the glyphs when the Pinyin setting is on.

### Flat example stream

Examples render flat on the study canvas — one row per sentence with a leading soft speaker button, the sentence and its translation stacked in the text column. No card, dividers, or per-row container: the rows breathe with plain vertical spacing so the grammar page reads as one continuous column, matching the pattern table's gloss-in-place rhythm. Dialogue examples group each speaker turn as one unit — speaker label, Chinese sentence, then that turn's pinyin and English directly beneath it — instead of separate per-language blocks. The table and examples follow the explanation directly with no "Sentence Pattern" / "Examples" section labels; each block carries an `aria-label` instead.

### Optional interactive teaching

Optional labs, contrasts, and sentence spines are implemented behind a single quiet `Explore this pattern` disclosure for a later beta phase. They are currently not mounted in the learner-facing grammar flow; preserve the authored content and disclosure component so it can be restored without redesign. Optional interactions never gate completion.

### Don't-mix-these-up clarifiers

Every grammar page carries a `confusion` block shown the same way the reader shows its Study Guide, through the shared `StudySidePanel` / `StudyDrawer` widgets: a permanent right-hand panel on desktop (`lg+`) inside the lesson's split layout, and a header lightbulb button on phones that opens the drawer over the study page. The lesson's hover zone and Continue footer live inside the content column, so no bottom fade ever crosses the panel. The block pre-empts the exact mix-ups beginners hit without cluttering the study page; the 2-4 items stay one tap (or zero taps on desktop) away. The block is required for every Book 1 grammar page and validated by `validateInteractiveLessons`.

Authoring rules:

- 2–4 items per page (aim for 3), each targeting a REAL trap for that specific point — never generic filler, never the same trap twice across pages.
- Pick traps from: forms learners blend inside the point (就 vs 才; 了 placement; 二 vs 兩), a neighboring point in the same lesson, carry-over behavior from an earlier lesson, and English-transfer mistakes (time-word position, 是 never linking to adjectives, measure words after numbers).
- `title` is exactly `Don't mix these up` on every page.
- Each item: `question` phrased as the learner would ask it; `answer` of at most two short plain-English sentences following the Plain English rules below; `wrongTraditional` showing the natural mistaken sentence; `right` as a fully tokenized `GrammarLessonText` (tappable, pinyin with correct sandhi, natural English). Reuse vocabulary already on the page where possible.
- Keep the wrong/right pair minimal: one clause each is ideal.

### Book reference overlay

Opening a book page replaces the entire workspace in an immersive fullscreen viewer on a semantic dark stage: it portals above the dialog and covers the full viewport (Books navigation included) so nothing disturbs the reference. Top and bottom controls are compact overlays that fade away after a short idle period; moving or tapping at the top or bottom edge reveals them, while interacting with the page itself keeps the reading surface clean. The top controls provide Close, the printed page title, page count, and only the available previous/next actions. The bottom controls are `− 100% +` (the edge control disables at 100% or 400%), with the percentage showing the current zoom; tapping the percentage returns to 100%. Keyboard focus and shortcuts reveal controls for accessibility. The page grows in layout and the viewer stage natively scrolls when zoomed, which keeps page edges crisp at browser zoom and high-DPR sizes. On touch screens, one finger pans the stage and a two-finger pinch smoothly zooms around the gesture center; Chrome/Edge Ctrl-wheel and Safari trackpad gesture events are intercepted for app-level zoom instead of browser page zoom. `←`/`→` change pages only when a destination exists, `+`/`−`/`0` change zoom, `Esc` and browser/System Back close. The grammar workspace underneath is inert while the viewer is open, and every close path returns focus to the `View book page(s)` action.

### Multiple valid responses

Use `acceptedAnswers` and `acceptedAnswersSimplified` on a blank when the source asks for a personal or open response with more than one grammatically valid answer. Keep one canonical `answer` for compatibility, then list only deliberately authored alternatives. Do not accept arbitrary strings or weaken structural checking.

Open textbook prompts do not have an answer key unless the source prints one. Label app-authored model answers explicitly and never present them as official textbook answers.

### Structured sentence building

The compact blank-tile exercise can also teach word order by rendering consecutive subject, verb, and object blanks. Use `sectionLabel` to separate a short structure-building round from a later meaning-focused round. Keep tiles character-sized or phrase-sized and use question-level `correctFeedback` and `repairFeedback` to explain the relevant grammar slot.

### Interactive sentence spines

Use the optional `sentenceSpine` recipe when a grammar point depends on a stable sequence of semantic roles, such as subject–verb–object order. The grammar lesson `SentenceSpine` component should introduce the meaning slots before the formal pattern table, preserve the same column proportions at every state, and use a switch only when changing one element materially clarifies the rule. For negation, keep the negation visually attached to the verb and preserve it as a separate tile in structure-building Practice so the learner must place it deliberately.

Use `patternColumnDetails` for compact notation such as `S`, `(Neg)V`, and `O` (≤ 8 units, e.g. `which word`, `right after`); keep the primary table labels as standardized 1–3 word grammar titles. The cell tooltip carries `label · detail`, and the column-share scorer reads the label's full width, so long headers are both unnecessary and penalised. Optional `teachingNote` text on examples should identify one useful discovery rather than restating the full translation. A `completionRecap` may contrast one correct sentence with a small number of deliberately authored structural mistakes after the exercise is complete.

### Guided timeline readings

Use `experience: 'timeline'` when a source Reading is organized around a printed schedule or sequence. Preserve the source paragraph once in `chunks`, then represent each printed event in `timeline` without inventing missing times. The learner flow is:

`Explore events -> Notice the repeated sentence pattern -> Rebuild the sequence + comprehension -> Reading completion`

The final action remains disabled until the sequence and all comprehension checks are correct. Reading completion persists independently from grammar completion and contributes to total lesson progress.

## Adding another grammar point

1. Verify the printed grammar explanation, examples, exercise, and visual dependencies.
2. Add an `InteractiveGrammarPage` entry to the registry.
3. Write one beginner-facing learner promise: what the learner can communicate after practice.
4. Segment Chinese examples into dictionary-sized words rather than individual characters.
5. Provide pinyin and an English translation for every learner-facing example.
6. Separate printed source content from app-authored models and repair feedback.
7. Use profiles or book cues only when required by the printed exercise.
8. Add the page to the existing `InteractiveGrammarPart` when it belongs to the same source Reading.
9. Create a new part only when the book moves to a new Reading section.
10. Run `npm run content:validate`, `npm test`, `npm run lint`, and `npm run build`.
11. Verify mobile and desktop grammar, script toggle, dictionary, navigation, completion, and overflow states.

Lesson 1 Part 1 currently follows this template:

`Grammar 1 (叫／姓／是) -> Grammar 2 (很／不) -> Grammar 3 (嗎) -> Part complete`

Lesson 1 Part 2 follows the same shell with the optional recipes above:

`Grammar 4 (呢 + 嗎/呢 contrast) -> Grammar 5 (S–V–O) -> Part complete`

Lesson 2 Part 1 uses discovery choices and source-labeled open-answer models:

`Grammar 1 (date/weekday/time) -> Grammar 2 (time before action) -> Grammar 3 (有／沒有) -> Part complete`

Lesson 2 Part 2 adds repair examples and explicit contrast language:

`Grammar 4 (的) -> Grammar 5 (intention before action) -> Grammar 6 (positive-negative questions) -> Part complete`

Lesson 2 Part 3 uses the guided timeline Reading recipe with the eight printed times from pages 63–64.

Do not add page-specific headings, continuation notes, pattern labels, or completion copy inside the shared screen components.

## Plain English for learners

All learner-facing English (titles, promises, explanations, glossary meanings, lab notes, feedback, hints, and completion copy) must work for beginners, including learners whose first language is not English.

- One idea per sentence. Split long sentences.
- Address the learner as "you".
- Use everyday words, and name sentence slots with their standard terms — **subject**, **verb**, **object**, **noun**, **adjective**, **number**, **measure word**, **statement** — instead of role phrases such as "who", "does / feels", or "who or what". Keep "ending word" for 嗎/呢/吧/了-type endings. Avoid rarer grammar-school jargon such as *predicate*, *auxiliary*, *intransitive/transitive*, *state verb*, *complement*, or *clause*.
- Keep these terms consistent across every lesson: **subject**, **verb**, **object**, **noun**, **adjective**, **number**, **measure word** (not "counting word"), **ending word**.
- Point at the actual Chinese example instead of explaining abstractly.
- Keep labels and hints short (about eight words or fewer).
- Keep the compact source notation (`S`, `V`, `O`, `(Neg)V`, `Vs`) only in `patternColumnDetails`; use the standardized grammar term in `patternColumns`.

Do not change Chinese text, pinyin, simplified forms, IDs, keys, or page/audio references during an English pass. Printed textbook sentences stay verbatim; app-authored model sentences are allowed only when clearly derived and labeled.

Sentence audio: never author `audio`. Grammar-page examples and pattern-table rows (except rows with `exampleId`) get the book's own grammar track first (`B1-LL-P-3.mp3`, the 🎧 01-1-3 icon beside 語法): `output/align-venv/bin/python scripts/audio/alignGrammarTracks.py L01 …` writes `content/audio/grammar_track_clips.json` with every syllable's onset; a clip is kept only if every stretch of speech in it belongs to the sentence (onset gaps ≤ 0.9 s, ≤ 2.5 s at punctuation or a speaker change; no syllable over 0.8 s; mean ≥ 0.85, every syllable ≥ 0.5). Near misses (clean timing, one weak syllable) go to `output/grammar-audio/near-misses.json`; the owner approves them by ear into `content/audio/grammar_track_approved.json`. Sentences the book doesn't say get voice B (Qwen3-TTS Vivian, Taiwan-accent instruction, picked by the owner): `generateGrammarStudioAudio.py --takes 6` renders 6 seeds, `scoreGrammarStudioTakes.py` times every syllable and keeps the steadiest take that says every word (Qwen slows down on numbers and times), and the owner approves by ear before upload. A table row with a recording shows a quiet play button (own column from tablet width, on the meaning line on a phone). `npm run content:export` attaches it to every sentence (anything with `traditional` and `english`) from `content/audio/grammar_book_clips.json` (re-run `python3 scripts/audio/matchGrammarBookClips.py` after adding sentences; it needs the official MP3s in `output/official-audio/book1/`) or `content/audio/grammar_studio_audio.json`. Book question particles (嗎, 呢) align at about 0.7, under the 0.85 bar, so they can't be cut cleanly yet.
