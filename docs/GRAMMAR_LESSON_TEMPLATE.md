# Grammar Lesson Template

Interactive grammar lessons currently use a grammar-only part flow:

`Grammar 1 (Learn + Practice) -> Grammar 2 (Learn + Practice) -> … -> Part completion`

Source Reading content remains stored on the part for a later feature, but it is not rendered or required for completion unless that part already has a dedicated Reading experience. A Reading may be a dialogue, story, narrative, introduction, or another source-text format. Learners switch between `Learn` and `Practice` using the bottom mode dock and move between grammar points using the header arrows. Changing grammar returns to Learn mode.

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
- A discovery interaction when comparison, repair, or meaning choice makes the rule easier to notice
- Segmented examples with pinyin, English translations, and dictionary meanings
- Data-driven exercise title, preview, instruction, optional note, and questions
- Optional profile cards or book exercise cues

Every Chinese teaching term, example segment, prompt, blank answer, and answer tile must expose a dictionary action. Lesson-authored contextual pinyin and meaning take priority over a generic dictionary gloss.

Grammar progress is stored per grammar page. Part progress is stored separately and currently becomes complete after every grammar exercise is complete.

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

Keep one three-column syntax-table structure on every viewport. On mobile, choose a content-weighted layout with `patternMobileLayout`: `leading-wide` when the opening phrase is longest, `middle-wide` when the predicate is longest, or `balanced` otherwise. Mobile table text steps down one size and may wrap within a cell when needed; never break the table into disconnected phrase cards or render separate desktop/mobile markup. Size a sentence-ending column for the grammar particle and its punctuation together (for example, `呢？`), not just the particle. The English meaning spans the full width directly beneath its Chinese row at every breakpoint. Use `patternAccentColumn` when the grammar focus is not the middle column.

### Multiple valid responses

Use `acceptedAnswers` and `acceptedAnswersSimplified` on a blank when the source asks for a personal or open response with more than one grammatically valid answer. Keep one canonical `answer` for compatibility, then list only deliberately authored alternatives. Do not accept arbitrary strings or weaken structural checking.

Open textbook prompts do not have an answer key unless the source prints one. Label app-authored model answers explicitly and never present them as official textbook answers.

### Structured sentence building

The compact blank-tile exercise can also teach word order by rendering consecutive subject, verb, and object blanks. Use `sectionLabel` to separate a short structure-building round from a later meaning-focused round. Keep tiles character-sized or phrase-sized and use question-level `correctFeedback` and `repairFeedback` to explain the relevant grammar slot.

### Interactive sentence spines

Use the optional `sentenceSpine` recipe when a grammar point depends on a stable sequence of semantic roles, such as subject–verb–object order. The shared `SentenceSpine` widget should introduce the meaning slots before the formal pattern table, preserve the same column proportions at every state, and use a switch only when changing one element materially clarifies the rule. For negation, keep the negation visually attached to the verb and preserve it as a separate tile in structure-building Practice so the learner must place it deliberately.

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
11. Verify mobile and desktop Learn, Practice, script toggle, dictionary, navigation, completion, and overflow states.

Lesson 1 Part 1 currently follows this template:

`Grammar 1 (叫／姓／是) -> Practice -> Grammar 2 (很／不) -> Practice -> Grammar 3 (嗎) -> Practice -> Part completion`

Lesson 1 Part 2 follows the same shell with the optional recipes above:

`Grammar 4 (呢 + 嗎/呢 contrast) -> Practice -> Grammar 5 (S–V–O) -> Practice -> Part completion`

Lesson 2 Part 1 uses discovery choices and source-labeled open-answer models:

`Grammar 1 (date/weekday/time) -> Grammar 2 (time before action) -> Grammar 3 (有／沒有) -> Part completion`

Lesson 2 Part 2 adds repair examples and explicit contrast language:

`Grammar 4 (的) -> Grammar 5 (intention before action) -> Grammar 6 (positive-negative questions) -> Part completion`

Lesson 2 Part 3 uses the guided timeline Reading recipe with the eight printed times from pages 63–64.

Do not add page-specific headings, continuation notes, pattern labels, or completion copy inside the shared screen components.
