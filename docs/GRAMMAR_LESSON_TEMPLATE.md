# Grammar Lesson Template

Interactive grammar lessons use a linear grammar-only part flow:

`Grammar 1 -> Grammar 2 -> … -> Part complete`

Source Reading content remains stored on the part for a later feature, but it is not rendered or required for completion unless that part already has a dedicated Reading experience. Each grammar step ends with one primary `Continue` action; a quiet `Back` appears after the first grammar. Continue marks the current grammar complete and advances to the next point; the final Continue marks the Part complete and closes the grammar window. There is no separate completion screen. Exercise data remains authored for a later beta phase but is not mounted in the learner-facing flow. Reopening a part resumes at the first incomplete grammar.

The screen and interaction logic live under `src/screens/grammar-lesson/`. Book-specific content lives in `src/data/grammar/` and is registered in `src/data/interactiveGrammarPages.ts`. A part conforms to `InteractiveGrammarPart`; each grammar point inside it conforms to `InteractiveGrammarPage`.

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
- Three pattern-column labels and one or more pattern rows
- A `confusion` block of don't-mix-these-up clarifiers (see below)
- A discovery interaction when comparison, repair, or meaning choice makes the rule easier to notice
- Segmented examples with pinyin, English translations, and dictionary meanings
- Data-driven exercise title, preview, instruction, optional note, and questions
- Optional profile cards or book exercise cues

Every Chinese teaching term, example segment, prompt, blank answer, and answer tile must expose a dictionary action. Lesson-authored contextual pinyin and meaning take priority over a generic dictionary gloss.

Grammar progress is stored per grammar page. Part progress is stored separately and currently becomes complete after every grammar page has been continued through.

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

Keep one adaptive syntax-table structure on every viewport. The slot header (`patternColumns` labels plus their compact `patternColumnDetails` notation) is a separate tinted band at the top of the table, never merged into an example row; its headings are `nowrap` so each column opens up just enough to keep every heading on a single line. All rows live together in one quiet table surface — a single shared CSS grid — with a thin neutral outline and internal dividers; do not create separate bordered cards or gaps between examples. Column tracks are sized from the longest visible traditional/simplified content, attached punctuation, pinyin, and slot heading, and the grid is capped by a centered `max-w`. On narrow viewports a single flexible `1fr` track absorbs leftover space and its neighbors hug their content (`min-content`), so a one-character slot never stretches; from 768px tracks spread by content weight with content-based minimums (`minmax(auto, share fr)`), so the table fills its card proportionally without one column ballooning past its content. The table surface always contains horizontal overflow by scrolling rather than clipping. Do not author layout modes (`patternMobileLayout` was removed); globally unused columns are omitted, while a row that lacks a group preserves that column position as an empty cell. Cell text wraps within the table when needed; never render separate desktop/mobile markup. If an unusually wide pattern requires five or more columns, contain horizontal overflow to the table surface only. The English meaning is a full-width centered band directly beneath its Chinese row inside the same table.

### Optional interactive teaching

Optional labs, contrasts, and sentence spines are implemented behind a single quiet `Explore this pattern` disclosure for a later beta phase. They are currently not mounted in the learner-facing grammar flow; preserve the authored content and disclosure component so it can be restored without redesign. Optional interactions never gate completion.

### Don't-mix-these-up clarifiers

Every grammar page carries a `confusion` block rendered collapsed behind a "Don't mix these up" toggle button after the Examples section, as the last part of the study page (`GrammarConfusionSection`). It pre-empts the exact mix-ups beginners hit without cluttering the study page; learners tap to expand the 2-4 items. The block is required for every Book 1 grammar page and validated by `validateInteractiveLessons`.

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

Use `patternColumnDetails` for compact notation such as `S`, `(Neg)V`, and `O`; keep the primary table labels in plain learner-facing language. Optional `teachingNote` text on examples should identify one useful discovery rather than restating the full translation. A `completionRecap` may contrast one correct sentence with a small number of deliberately authored structural mistakes after the exercise is complete.

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
- Use everyday words. Do not use grammar-school terms such as *predicate*, *subject*, *object*, *auxiliary*, *intransitive/transitive*, *state verb*, *complement*, *clause*, *particle*, or *adverb*. Use plain replacements instead: "action word", "describing word", "ending word" (for 嗎/呢/吧/了-type endings), "the person or thing the sentence is about".
- Keep these terms consistent across every lesson: **measure word** (not "counting word"), **action word**, **describing word**, **ending word**.
- Point at the actual Chinese example instead of explaining abstractly.
- Keep labels and hints short (about eight words or fewer).
- Keep the compact source notation (`S`, `V`, `O`, `(Neg)V`, `Vs`) only in `patternColumnDetails`; use plain words in `patternColumns`.

Do not change Chinese text, pinyin, simplified forms, IDs, keys, or page/audio references during an English pass. Printed textbook sentences stay verbatim; app-authored model sentences are allowed only when clearly derived and labeled.
