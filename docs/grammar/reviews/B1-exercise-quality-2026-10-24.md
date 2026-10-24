# Book 1 exercise quality audit — 2026-10-24

Verdict: FIXES NEEDED. Audit and prototype only; exercise content, application code and generated packs have not been changed.

## Scope and evidence

All **376 authored Book 1 items across 76 grammar groups** were reviewed: 293 labeled book items and 83 labeled own items. Book 3 is excluded. The 293 count is the current attribution, not a claim that all printed subitems are covered: L4 has missing stimuli and one printed number mislabeled as own.

The review compared the 16 `content/grammar-practice/lesson*.json` files with the available `materials/book1/LXX/transcript.md` and `exercises.json`, and traced presentation through the exercise renderers and export attachment. Three Luna reviewers divided the content review; the main reviewer checked the shared behavior, source/answer examples, counts and proposed changes, rejecting false positives before consolidation.

English is allowed for brief task instructions and feedback. Chinese questions, source sentences and illustrations should supply the problem. Preserve the book situation, order and target; increase challenge through production and meaningful contrasts using already-taught language. A picture description or translated answer is not a neutral instruction. Conversely, do not remove essential context from an open question and then secretly require one completion.

Scans are available only for part of the material. Later lessons, especially L14, have unresolved source-image descriptions. Transcripts establish textual coverage but cannot certify every generated illustration. L16 grammar 2–5 exercise pages are absent from the available material; the associated app items are labeled own. No claim of complete physical-book coverage is made for those pages.

## Confirmed shared problems

| Priority | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- |
| P1 | The word bank can display the answer in order. | 109/236 order/listening builds have the first accepted answer as the exact prefix of `tiles`; 113/236 contain it as a subsequence. `OrderBuildExercise` iterates tile indexes unchanged; `attachGrammarPractice` attaches the data unchanged. The screenshot's `l9g3-p1` is an exact-prefix case. | Mix display indexes once per item, retaining identity for repeated tiles, drag, keyboard selection and retries. Do not rewrite every JSON bank or shuffle on every render. Review the other bank renderers under the same rule. |
| P1 | English supplies the response instead of letting the learner interpret the source. | `l9g3-p1`: “First the art class, then tennis.” `l12g2-p3`: “She liked tea before; now she likes coffee.” `l15g1-p3`: “The two sisters run at the same speed.” These disclose the pictured sequence/change/comparison. | Restore source Chinese questions/starters and keep a short English task instruction. The image carries its information. For genuinely open book prompts, provide a minimal scenario cue using taught language or a visual, without presenting a full translated model. |
| P1 | Source questions are sometimes lost, leaving the feedback to refer to an unseen question. | `l9g3-p1` has no `sub` or Chinese question in `lines`; its repair says “The question asks 上什麼課”. The printed question is `你明天下午要上什麼課？`. The same group loses the original questions for p2/p3. | Restore all three source questions. In p1 the distinction between taking a class and simply playing tennis is meaningful only after the learner sees the question. Preserve natural accepted short answers. |
| P2 | Matching instructions are suppressed even when authored. | `GrammarPracticeView` puts `match-pairs` in `QUIET_KINDS`; the matching renderer shows only `sub`. Both match items have their instruction in `prompt`. | Show the existing instructions for `l8g2-own-match` and `l10g5-own-match`. Do not assume columns teach the interaction. |
| P2 | A quiet item can hide its only task instruction. | `l9g2-p1` has `quiet: true`, no `sub`, and just a reply frame; the original Chinese restaurant question is absent. | Restore `這家餐廳哪天要休息？` and a clear placement instruction. Review quiet items by what is actually visible rather than globally turning every title on. |
| P2 | All 29 `spot-fix` exercises display the corrected sentence before the answer. | `SpotFixExercise` creates one option from `item.result` and one from `chunks`; the learner only chooses a complete sentence. The data and pure `checkSpotFix` support finding a chunk and repairing it, but the renderer bypasses that interaction. | Restore find → repair for suitable items. Use two complete sentences only when discrimination is the intended task, and state that task honestly. Audit meaning-change examples separately: not every non-target sentence is ungrammatical. |
| P2 | The font's weight setting cannot supply a real heavier face. | `PracticeChoiceButton` already supplies inherited `font-bold`, so a missing bold class is not the root cause of thin matching text. Huninn ships only weight 400; explicit Huninn/Kai settings disable synthetic weight in `src/index.css`. Other sentence surfaces also differ in weight. | Use existing Chinese sans with real semibold weight consistently for exercise sentences, matches and answer tiles in the previewed direction. Keep the change scoped to exercises; do not globally enable synthetic bold or alter focused-study characters. Confirm the face at 390 and 1440 before rollout. |
| P2 | Feedback exposes internal slot identifiers. | Ten repair notes across `l11g3-p3`, `l11g4-p3`, `l11g4-p4`, `l13g2-p3` literally say `g0`, `g1` or `g2`. | Name the clause or phrase the learner sees, e.g. “After 看到, name what you see.” Preserve specific repairs for actual errors. |

The census contains 133 scene-backed items, including 97 whose titles are not quiet, and 118 quiet items overall. These are review queues, not 97 confirmed answer leaks or 118 missing instructions. Some scene titles correctly ask a question without supplying an answer; some quiet screens already show their task in a dialogue.

## Book coverage and lesson-level findings

| Lesson | Items | Book / own | Finding or next action |
| --- | ---: | ---: | --- |
| L01 | 24 | 16 / 8 | Keep cast/picture questions; review answer-bearing prompts in G2 and G4–G5. No separate confirmed source-coverage defect found. |
| L02 | 24 | 18 / 6 | Time/date items already have explicit clock/calendar scenes and matching accepted answers: do not “fix” them. `l2g02-4` says staying at school while the answer only says not going home; tighten the scenario rather than treating these meanings as equivalent. |
| L03 | 20 | 15 / 5 | Review gift/preference/deictic cues: retain speaker position or preference when the picture cannot choose it. Remove full answer paraphrases where Chinese plus picture already suffices. |
| L04 | 25 | 19 / 6 | P1: 12 printed numerical stimuli are absent. One covered printed number is mislabeled own; one source page is wrong; p.107 #2/#3 are reversed. Details below. |
| L05 | 18 | 16 / 2 | `l05-g01-book-3` reduces a full question-building exercise to placing 嗎. `l05-g02-book-3` drops the source restaurant continuation; preserve that dialogue contrast. |
| L06 | 27 | 24 / 3 | Review English scenario length and preserve original Chinese questions. Some personal ability/performance questions need context; removing all cues would make grading arbitrary. |
| L07 | 21 | 15 / 6 | Review English explanations beside change/route scenes. Speaker location for 來/去 is essential; retain it in a minimal cue. Do not confuse necessary viewpoint information with an answer leak. |
| L08 | 22 | 18 / 4 | Restore matching instruction. Keep the reading/reasoning task in Chinese; retain any necessary scenario cue when the source is open-ended. |
| L09 | 27 | 21 / 6 | Highest priority examples: original questions missing in G3, English sequence giveaways, and quiet G2p1. Review all G1–G5 picture titles, including explicit yes/no outcomes and comparison preferences. |
| L10 | 29 | 22 / 7 | Review G1 picture prompts, G2 relative-clause response paraphrases and G5 conditional-result translations. Some are open book prompts requiring a scenario; do not strip context without a replacement. Both tea/cake alternatives in `l10g1-p1` are already accepted. |
| L11 | 24 | 20 / 4 | Review G1/G4 picture-answer paraphrases and internal slot IDs. `l11g3-p3` already accepts both sister/classmate companions and discloses the editorial model date; do not report these as rejected alternatives. `l12g4-p5` doctor translation is tracked under L12. |
| L12 | 34 | 27 / 7 | Review G1 instrument/language pictures and G2 before/after and sequence pictures. In G4p5 prefer “I have already seen the doctor” over an unsupported male pronoun in the English feedback. Rewrite tasks should retain the original Chinese source sentence. |
| L13 | 25 | 23 / 2 | Preserve both accepted cat/post-office answers in `l13g2-p3`; no answer-key defect is established. Remove internal IDs in its repairs. Review reduplication distractors and preserve printed Chinese for rearrange/rewrite items in G5. |
| L14 | 28 | 24 / 4 | Remove redundant duration translations where clocks supply the facts; preserve Chinese questions. Source-image actions on pp.320–321 and 323–324 remain unverified; do not certify generated art as book evidence. Keep open model completions distinguished from printed answers. |
| L15 | 13 | 9 / 4 | Remove English same/different/speed conclusions from G1 picture tasks and redundant scene descriptions from G2. G3 rewrite items should show the original Chinese sentence. Directional “not as smart” versus 不一樣 needs a separate source/semantics check, not an automatic grammar correction. |
| L16 | 15 | 6 / 9 | Near/far completions in G1 include editorial scenario choices because the referenced map is absent. Retain clear scenario context or source it; do not silently call these book facts. Own G5 model omits 的 from the printed 自己的國家: source-wording alignment candidate, not proof of ungrammaticality. |

### L4 numerical coverage, verified against the source list

Printed p.104 #1 has 150, 5,080, 630,000, 9,400,000, 309, 7,200, 800,500 and 13,000,000. The app covers 5,080 and 630,000; the latter is `l04-g4-own2`, mislabeled own. **Six number readings are missing**.

Printed p.104 #2 has four phone numbers. Only 0936-068-493 is covered. **Missing:** 0930-252-242, 0988-321-259 and 0955-734-068.

Printed p.105 #3 has 201 cups, 2,200 teachers, 5,005 people and 512,300 money. Only 5,005 people is covered. **Three number-plus-noun stimuli are missing**. Its item `l04-g4-book3` incorrectly cites p.104 #3.

That is **12 wholly absent stimuli**, rather than 13: counting 630,000 as absent would overlook the existing mislabeled item. Restore source order and attribution. `l04-g4-own1` uses 78,000, already a worked example; decide whether it tests a distinct mistake after book coverage is restored. `l04-g5-book6` currently precedes `book5`, reversing p.107 #3 and #2.

### L5 interaction and source preservation

`l05-g01-book-3` supplies the statement `李老師今天早上九點在學校` and only asks where to add 嗎. The source supplies that statement as B's answer and leaves A's whole question open. The current item can be solved through particle recognition without building the location question. Its English prompt is hidden by `quiet`; the confirmed weakness is the answering task, not a visible English title. Restore the supplied reply and ask the learner to build a fitting question with taught language.

`l05-g02-book-3` prints the question `你今天要在家吃晚飯嗎？` but omits B's printed continuation `我要在餐廳吃晚飯。`. The app's negative answer is natural, but the source's explicit home/restaurant contrast is lost. Preserve the continuation and avoid secretly requiring wording beyond the task.

## Redesign rules for the implementation pass

1. For picture questions, show the book's Chinese question and a neutral instruction. Preserve speaker/viewpoint cues. Let the picture carry action, time, order or comparison facts; do not repeat those facts as an English answer.
2. For rewrite/rearrange tasks (notably L13 G5 and L15 G3), show the original Chinese sentence. English should describe the operation, not replace the source sentence with a translation.
3. For genuinely open questions, provide a short, understandable practice scenario or accept the coherent alternatives the bank supports. Do not infer two cups of coffee from a drawing of one cup and two cookies (`l9g4-p3`); that amount is editorial context, not a visual fact. The same care applies to preferences in L9 comparisons and near/far scenarios in L16.
4. Show an instruction where the interaction needs one. Avoid duplicated title/bubble copy. Hints and translations may help on request; neither should silently solve the initial task. Keep English translations in answer feedback.
5. Make wrong choices plausible for the taught contrast. Do not call a grammatical alternative wrong merely because it differs from the canonical answer. Existing concise answers and alternate word orders must continue to pass. Frame repair tasks around the intended meaning when the original can be grammatical with another meaning.
6. Add challenge by building the target pattern, locating a real mistake or interpreting evidence. Do not increase vocabulary/grammar scope, tile count, clause length or arbitrary difficulty. Keep the six-tile and short-tile constraints; use the existing gap interaction where a full build would become unwieldy.
7. Finish all source items before adding variations. Own items should cover a distinct mistake rather than repeat an existing source pattern unchanged.

## Concrete implementation plan after prototype approval

1. In `src/features/grammar-practice/GrammarPracticeView.tsx` and exercise components, restore task visibility for matching and source-dependent quiet items; keep titles concise. Restore needed Chinese context through existing fields, without a new schema.
2. Mix bank display indexes once per item in the existing build/gap renderers, reusing the repository shuffle implementation if its placement is appropriate. Keep repeated tile identities, retries and drag mappings stable. No new dependency or abstraction is needed by default.
3. In `SpotFixExercise.tsx`, use the existing chunk/replacement data and checker for find → repair where it is a real improvement. Keep source-vs-meaning judgments honest. Do not impose two-step repair on inherently open or valid-alternative examples.
4. Standardize exercise sentence/choice typography with existing Chinese sans/semibold tokens. Scope it to grammar practice rather than changing `src/index.css` globally or the study font preference throughout the app.
5. Edit all 16 `content/grammar-practice/lesson*.json` files as required by the item-level review: restore Chinese source questions, remove redundant answer translations, shorten necessary scenarios, repair learner-facing feedback, restore L4 source subitems and L5 dialogue fidelity. Retain IDs where possible. Escalate unavailable source images instead of inventing facts.
6. Update `docs/GRAMMAR_LESSON_TEMPLATE.md` and conflicting authoring guidance to reflect the owner's current English/instruction and matching requirements. Existing docs explicitly prescribe hiding matching titles; a code-only fix would leave that instruction stale. The owner may authorize rule-file updates as part of implementation.
7. Regenerate packs via `npm run content:export`; never edit generated packs manually. Run scoped code/content gates once after the final edits. Add meaningful regression checks for visible tasks, stable mixed banks, real repair behavior, source subitem coverage and retained accepted alternatives. Verify 390×844/1440 desktop DEV previews without recording real progress; commit and push the completed changes on main.

## Prototype and validation

The standalone review prototype is `output/exercise-quality-preview/index.html`, served locally at `http://127.0.0.1:4319/`. It offers current/proposed comparisons for sequence, date range, reason/result matching and find/repair; picture-first is recommended, with question-first available for comparison. It uses the existing Nunito asset, app colors and existing illustrations; the proposed Chinese face uses the existing Chinese sans stack at semibold. No dependency was added. This is a mock shell, not a production implementation or a complete pixel replica of every current renderer.

Checked in the in-app browser: 390×844 and 1440×900 outer prototype canvases, sequence construction/correct feedback, range-marker placement, matching correct/wrong feedback, and identifying/removing the wrong word. The 1440 canvas is scaled to fit the review pane. This does not substitute for Safari/Chrome testing of the final app.

- `npm run content:validate`: PASS — “Interactive lesson content valid.”
- `node --import tsx --test tests/content/grammarPractice*.test.ts tests/unit/grammarPracticeCheck.test.ts`: PASS — 31 tests, 0 failures.
- Prototype JavaScript syntax check: PASS.
- `npm test` (full documentation acceptance gate): PASS — 1,167 tests, 0 failures.
- `git diff --check`: PASS.
- Typecheck/lint/jev: not run; no application, server or test code changed.

Existing validators passing does not establish instructional quality. For example, `grammarPracticeQuality.test.ts` narrows its checks to slot-build items; it cannot catch a corrected sentence exposed by the spot-fix renderer, suppressed matching instructions, or English translations replacing picture interpretation.

## Item inventory

Every current Book 1 ID is listed below. “Reviewed” means checked in this audit, not approved for release or confirmed against unavailable scans. Shared renderer findings apply in addition to lesson-specific issues above.

### L01 — 24 reviewed

`l1g1-p1`, `l1g1-p2`, `l1g1-p3`, `l1g1-p4`, `l1g1-own-order`, `l1g1-own-spot`, `l1g1-own-pick`, `l1g2-p1`, `l1g2-p2`, `l1g2-p3`, `l1g2-own-listen`, `l1g2-own-pick`, `l1g3-p1`, `l1g3-p2`, `l1g3-p3`, `l1g4-p1`, `l1g4-p2`, `l1g4-p3`, `l1g4-own2`, `l1g4-own-story`, `l1g5-p1`, `l1g5-p2`, `l1g5-p3`, `l1g5-own-spot`.

### L02 — 24 reviewed

`l2g01-1`, `l2g01-2`, `l2g01-3`, `l2g01-4`, `l2g02-1`, `l2g02-2`, `l2g02-3`, `l2g02-4`, `l2g02-own-story`, `l2g03-1`, `l2g03-2`, `l2g03-3`, `l2g03-own-listen`, `l2g04-1`, `l2g04-2`, `l2g04-3`, `l2g05-1`, `l2g05-2`, `l2g05-3`, `l2g05-4`, `l2g06-1`, `l2g06-2`, `l2g06-3`, `l2g06-4`.

### L03 — 20 reviewed

`l3-g1-book-1`, `l3-g1-book-2`, `l3-g1-book-3`, `l3-g1-own-1`, `l3-g1-own-2`, `l3-g2-book-1`, `l3-g2-book-2`, `l3-g2-book-3`, `l3-g2-own-listen`, `l3-g3-book-1`, `l3-g3-book-2`, `l3-g3-book-3`, `l3-g3-own-1`, `l3-g4-book-1`, `l3-g4-book-2`, `l3-g4-book-3`, `l3-g4-own-1`, `l3-g5-book-1`, `l3-g5-book-2`, `l3-g5-book-3`.

### L04 — 25 reviewed

`l04-g1-book1`, `l04-g1-book2`, `l04-g1-book3`, `l04-g1-book4`, `l04-g2-book1`, `l04-g2-book2`, `l04-g2-book3`, `l04-g2-own-spot`, `l04-g3-book1`, `l04-g3-book2`, `l04-g3-book3`, `l04-g3-own1`, `l04-g4-book1`, `l04-g4-book2`, `l04-g4-book3`, `l04-g4-own1`, `l04-g4-own2`, `l04-g5-book1`, `l04-g5-book2`, `l04-g5-book3`, `l04-g5-book4`, `l04-g5-book6`, `l04-g5-book5`, `l04-g5-own-sort`, `l04-g5-own-listen`.

### L05 — 18 reviewed

`l05-g01-book-1`, `l05-g01-book-2`, `l05-g01-book-3`, `l05-g02-book-1`, `l05-g02-book-2`, `l05-g02-book-3`, `l05-g02-own-order`, `l05-g03-book-1`, `l05-g03-book-2`, `l05-g03-book-3`, `l05-g04-book-1`, `l05-g04-book-2`, `l05-g04-book-3`, `l05-g04-book-4`, `l05-g04-own-listen`, `l05-g05-book-1`, `l05-g05-book-2`, `l05-g05-book-3`.

### L06 — 27 reviewed

`b1l06-g01-p135-practice-1`, `b1l06-g01-p135-practice-2`, `b1l06-g01-p135-practice-3`, `b1l06-g01-p135-practice-4`, `b1l06-g02-p136-practice-1`, `b1l06-g02-p136-practice-2`, `b1l06-g02-p136-practice-3`, `b1l06-g02-p136-practice-4`, `b1l06-g02-p136-practice-5`, `b1l06-g02-p136-practice-6`, `b1l06-g02-p136-practice-7`, `b1l06-g02-p136-practice-8`, `b1l06-g02-p136-practice-9`, `b1l06-g02-p136-practice-10`, `b1l06-g02-p136-practice-11`, `b1l06-g02-p136-practice-12`, `b1l06-g03-p146-practice-1`, `b1l06-g03-p146-practice-2`, `b1l06-g03-p146-practice-3`, `b1l06-g03-own-spot`, `b1l06-g04-p147-practice-1`, `b1l06-g04-p147-practice-2`, `b1l06-g04-p147-practice-3`, `b1l06-g04-p147-practice-4`, `b1l06-g04-p147-practice-5`, `b1l06-g04-p147-practice-6`, `b1l06-g04-own-sort`.

### L07 — 21 reviewed

`l7g1-b1`, `l7g1-b2`, `l7g1-b3`, `l7g1-o1`, `l7g2-b1`, `l7g2-b2`, `l7g2-b3`, `l7g2-o1`, `l7g2-own-listen`, `l7g3-b1`, `l7g3-b2`, `l7g3-b3`, `l7g4-b1`, `l7g4-b2`, `l7g4-b3`, `l7g4-o1`, `l7g5-b1`, `l7g5-b2`, `l7g5-b3`, `l7g5-o1`, `l7g5-own-order`.

### L08 — 22 reviewed

`l8g1-p1`, `l8g1-p2`, `l8g1-p3`, `l8g1-p4`, `l8g1-p5`, `l8g1-p6`, `l8g2-p1`, `l8g2-p2`, `l8g2-p3`, `l8g2-own-match`, `l8g2-own-listen`, `l8g3-p1`, `l8g3-p2`, `l8g3-p3`, `l8g3-own-sort`, `l8g4-p1`, `l8g4-p2`, `l8g4-p3`, `l8g4-own1`, `l8g5-p1`, `l8g5-p2`, `l8g5-p3`.

### L09 — 27 reviewed

`l9g1-p1`, `l9g1-p2`, `l9g1-p3`, `l9g1-own-spot`, `l9g2-p1`, `l9g2-p2`, `l9g2-p3`, `l9g2-own-spot`, `l9g3-p1`, `l9g3-p2`, `l9g3-p3`, `l9g3-own-story`, `l9g3-own-meaning`, `l9g4-p1`, `l9g4-p2`, `l9g4-p3`, `l9g4-p4`, `l9g4-p5`, `l9g4-p6`, `l9g4-p7`, `l9g4-p8`, `l9g4-p9`, `l9g4-own-spot`, `l9g5-p1`, `l9g5-p2`, `l9g5-p3`, `l9g5-own-spot`.

### L10 — 29 reviewed

`l10g1-p1`, `l10g1-p2`, `l10g1-p3`, `l10g1-p4`, `l10g1-own-order`, `l10g1-own-spot`, `l10g2-p1`, `l10g2-p2`, `l10g2-p3`, `l10g2-p4`, `l10g2-p5`, `l10g2-p6`, `l10g2-p7`, `l10g2-p8`, `l10g2-p9`, `l10g2-own-spot`, `l10g2-own-sort`, `l10g3-p1`, `l10g3-p2`, `l10g3-p3`, `l10g3-own-spot`, `l10g4-p1`, `l10g4-p2`, `l10g4-p3`, `l10g4-own-sort`, `l10g5-p1`, `l10g5-p2`, `l10g5-p3`, `l10g5-own-match`.

### L11 — 24 reviewed

`l11g1-p1`, `l11g1-p2`, `l11g1-p3`, `l11g1-p4`, `l11g1-p5`, `l11g1-own-spot`, `l11g2-p1`, `l11g2-p2`, `l11g2-p3`, `l11g2-p4`, `l11g3-p1`, `l11g3-p2`, `l11g3-p3`, `l11g3-own-spot`, `l11g4-p1`, `l11g4-p2`, `l11g4-p3`, `l11g4-p4`, `l11g4-p5`, `l11g4-own-spot`, `l11g5-p1`, `l11g5-p2`, `l11g5-p3`, `l11g5-own-spot`.

### L12 — 34 reviewed

`l12g1-p1`, `l12g1-p2`, `l12g1-p3`, `l12g1-own-1`, `l12g1-own-2`, `l12g2-p1`, `l12g2-p2`, `l12g2-p3`, `l12g2-p4`, `l12g2-p5`, `l12g2-p6`, `l12g2-p7`, `l12g2-p8`, `l12g2-p9`, `l12g2-p10`, `l12g2-p11`, `l12g2-own-1`, `l12g2-own-meaning`, `l12g2-own-sort`, `l12g3-p1`, `l12g3-p2`, `l12g3-p3`, `l12g3-p4`, `l12g4-p1`, `l12g4-p2`, `l12g4-p3`, `l12g4-p4`, `l12g4-p5`, `l12g4-p6`, `l12g4-own-spot`, `l12g5-p1`, `l12g5-p2`, `l12g5-p3`, `l12g5-own-spot`.

### L13 — 25 reviewed

`l13g1-p1`, `l13g1-p2`, `l13g1-p3`, `l13g1-own-spot`, `l13g2-p1`, `l13g2-p2`, `l13g2-p3`, `l13g3-p1`, `l13g3-p2`, `l13g3-p3`, `l13g3-own-spot`, `l13g4-p1`, `l13g4-p2`, `l13g4-p3`, `l13g5-p1`, `l13g5-p2`, `l13g5-p3`, `l13g5-p4`, `l13g5-p5`, `l13g5-p6`, `l13g5-p7`, `l13g5-p8`, `l13g5-p9`, `l13g5-p10`, `l13g5-p11`.

### L14 — 28 reviewed

`l14g1-p1`, `l14g1-p2`, `l14g1-p3`, `l14g1-p3a`, `l14g1-p4`, `l14g1-p5`, `l14g1-p6`, `l14g1-p7`, `l14g1-p8`, `l14g1-own-1`, `l14g2-p1`, `l14g2-p2`, `l14g2-p3`, `l14g2-p4`, `l14g2-p5`, `l14g2-p6`, `l14g2-p7`, `l14g2-p8`, `l14g2-p9`, `l14g2-own-order`, `l14g3-p1`, `l14g3-p2`, `l14g3-p3`, `l14g3-p4`, `l14g3-p5`, `l14g3-p6`, `l14g3-own-spot`, `l14g3-own-meaning`.

### L15 — 13 reviewed

`l15g1-p1`, `l15g1-p2`, `l15g1-p3`, `l15g1-own-spot`, `l15g1-own-meaning`, `l15g3-p1`, `l15g3-p2`, `l15g3-p3`, `l15g3-own-spot`, `l15g2-p1`, `l15g2-p2`, `l15g2-p3`, `l15g2-own-sort`.

### L16 — 15 reviewed

`l16g1-p0a`, `l16g1-p0b`, `l16g1-p0c`, `l16g1-p1`, `l16g1-p2`, `l16g1-p3`, `l16g1-own-1`, `l16g1-own-2`, `l16g2-own-1`, `l16g2-own-spot`, `l16g3-own-1`, `l16g3-own-spot`, `l16g4-own-1`, `l16g5-own-spot`, `l16g5-own-2`.
