# Lesson 1, Part 2 Grammar Plan

## Outcome

Build Lesson 1, Part 2 as one reading-centered grammar unit. Its source Reading happens to use a dialogue format:

`Grammar 4 (呢) -> Practice -> Grammar 5 (S + V + O) -> Practice -> Part complete`

After the part, the learner should be able to return a question with `呢` and say who or what they like or love using a basic subject-verb-object sentence.

Reading 2 remains stored on the part in its dialogue format but stays hidden from navigation and completion until its dedicated Reading experience is designed.

## Why this should feel better than the book

The book provides accurate explanations, examples, and blank-answer exercises. RongWaps should preserve that source material while adding four learning advantages:

1. **Contrast before memorization:** explicitly compare `嗎` and `呢` so learners understand that `嗎` creates a yes/no question while `呢` returns or redirects an already-established question.
2. **Progressive retrieval:** begin with visible sentence structure, then remove support in Practice.
3. **Meaningful answers:** accept more than one grammatically valid response when the book asks a personal question. A learner may truthfully say either `我喜歡臺灣` or `我不喜歡臺灣`.
4. **Explanatory feedback:** after checking, explain why the structure works instead of showing only correct/incorrect color.

## Source boundary

Use the verified Lesson 1 source archive:

- Grammar 4: `B1L01-G04`, printed page 44, audio `01-2-3`
- Grammar 4 exercise: `B1L01-E04`, printed pages 44-45
- Grammar 5: `B1L01-G05`, printed page 45, audio `01-2-3`
- Grammar 5 exercise: `B1L01-E05`, printed page 45
- Shared Reading 2 (dialogue format): `B1L01-D02`, printed pages 41-42, audio `01-2-1`

Do not invent a printed Chinese title for Grammar 5. Use the English source title in the page heading and treat any Chinese slot labels as app-authored teaching aids.

## Grammar 4: 呢

### Learn

Keep the existing flat reading layout and teach this sequence:

1. **Plain explanation:** `呢` stands in for a question that the conversation has already established.
2. **Pattern:** `Statement, + N + 呢`
3. **Book examples:** preserve the two pattern rows and three numbered examples.
4. **Reusable contrast block:** show a compact side-by-side comparison:
   - `你是日本人嗎？` — asks a new yes/no question.
   - `我是日本人，你呢？` — returns the established question to another person.
5. **Micro-check:** ask which particle fits a short exchange before the learner opens Practice. This is low-stakes and does not count toward completion.

### Practice

Adapt the three source questions into tap/drag response building:

1. `我是美國人，___？` -> `你呢`
2. `我姓李，你呢？` -> build one valid reply such as `我姓小林`
3. `他很忙，___？` -> `你呢`, followed by a truthful choice between `我很忙` and `我不忙`

The third response must accept both grammatically valid personal answers. Feedback should state that `呢` borrows the topic or question from the previous clause.

## Grammar 5: Subject-Verb-Object

### Learn

Teach the structure as three semantic slots rather than an abstract label only:

- **Who:** subject
- **Does/feels:** verb, optionally preceded by `不`
- **Who/what:** object

Use the source pattern `S + (Neg)V + O`, the source pattern row, and all three numbered examples. Add a short app-authored note that Chinese does not insert `是` between the subject and verbs such as `喜歡` or `愛`.

The learner should be able to tap words for dictionary support exactly as in the existing grammar pages.

### Practice

Use two short rounds inside the existing Practice mode:

1. **Build the structure:** order compact tiles into S-V-O sentences. Include one positive and one negative sentence.
2. **Answer with meaning:** adapt the three book questions.
   - `你喜歡臺灣嗎？` accepts both `我喜歡臺灣` and `我不喜歡臺灣`.
   - `你喜歡誰？` offers several grammatical people-based answers and accepts the learner's selection.
   - `王先生愛王太太嗎？` uses the verified illustration cue and expects the source-supported positive answer.

The final feedback should name the slot that was misplaced or omitted: subject, verb/negation, or object. Avoid generic “try again” feedback when a structural explanation is available.

## Part 2 content contract

Add one `InteractiveGrammarPart` with:

- ID: `B1L01-P02-D02`
- `bookId: 1`, `lessonId: 1`, `partId: 2`
- Grammar pages: Grammar 4 then Grammar 5
- Shared Reading 2 stored once in its dialogue format
- Completion promise: “You can return a question and say who or what you like.”
- Next-book label pointing to the reading on printed page 46

The curriculum must render this as one Part 2 grammar card with two grammar points. Do not create separate top-level cards for Grammar 4 and Grammar 5.

## Reusable model changes

Extend the existing grammar template rather than creating a second template:

1. Allow a blank or response to declare multiple accepted answers.
2. Add optional success/repair explanations at the question level.
3. Add an optional data-driven grammar contrast block.
4. Add an optional sentence-order activity for S-V-O practice only if it can remain generic and prop-driven.

Keep these additions in `src/types/models.ts`. Book-specific strings and answer sets remain in `src/data/interactiveGrammarPages.ts`. Exercise state belongs in a feature hook under `src/screens/grammar-lesson/hooks/`; presentational pieces remain dumb components under `src/screens/grammar-lesson/components/`.

## Implementation sequence

1. Add the minimal reusable model fields and answer-checking support for multiple valid answers.
2. Add Grammar 4, Grammar 5, Reading 2 (dialogue-format content), and Part 2 data to the registry.
3. Add the `嗎`/`呢` contrast presenter and optional micro-check.
4. Add the generic sentence-order round if the data cannot be expressed clearly with the existing compact blank tiles.
5. Add per-question explanatory feedback without changing the visual hierarchy of existing Part 1 practice.
6. Confirm the curriculum shows Part 1 and Part 2 as separate reading-centered cards.
7. Update `docs/GRAMMAR_LESSON_TEMPLATE.md` with the new optional recipes after the implementation has proved reusable.

## Verification gate

- Typecheck and production build pass.
- Existing Part 1 behavior and saved completion IDs remain compatible.
- Part 2 opens at Grammar 4 and progresses to Grammar 5.
- Previous/Next always returns the selected grammar to Learn mode.
- Both valid personal answers pass where specified; invalid word order does not.
- Traditional/simplified switching works for every new sentence and tile.
- Reading-aid toggles remain available only in Learn.
- No dialogue navigation or dialogue completion requirement appears.
- At 390x844, the title, printed-page badge, pattern rows, answer tiles, feedback, and bottom mode dock do not overlap or clip.
- At 1440x1000, the workspace stays inside the permanent side navigation and does not become an oversized nested-card layout.
- Keyboard focus, pressed states, disabled states, and screen-reader labels are present for every new interaction.

## Template decision

Do not create a new lesson template. `docs/GRAMMAR_LESSON_TEMPLATE.md` is already the canonical structure. Extend it only after the new contrast, multiple-answer, and sentence-order recipes are implemented and verified.
