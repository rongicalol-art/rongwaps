# L01–L08 exercise quality — Codex, 2026-10-23

Verdict: PASS

## Checked

- Scanned all 215 authored practice items for format, prompts, tile banks and repair coverage; reviewed degree, particle, negation and question-form contrasts for hidden requirements.
- Compared the reported L4 tasks with `materials/book1/L04/transcript.md`, pp.98–99. The printed exercise requests 太…了; the app was hiding the prompt and returning a generic unfinished warning before checking 很.
- Preserved every item ID, source, scene and book-item order. Reused existing sentence-build and placement interactions.
- Split existing model readings into short tiles. Added no recording keys, verification flags, dependencies or exercise types.

## Issues

- `GrammarPracticeView.tsx`: generic headings concealed the intended meaning/form. The authored item question is now always visible.
- `SlotBuildExercise.tsx`, `grammarPracticeCheck.ts`: the UI's answer-count check masked specific repairs; the shared checker also accepted empty gap submissions. Completion and repairs now come from the shared checker, with regression coverage for empty, partial, wrong-meaning and complete answers.
- `lessonFour.json`: 很小, 他很累 and 很好喝 now receive feedback acknowledging valid Chinese while explaining the requested 太…了 meaning.
- `lesson{Three,Four,Five,Eight}.json`: converted 21 short single-tile placements to sentence builds with taught distractors and specific repairs. Kept longer particle-position items; clarified their prompts. Fixed first clauses remain visible as context when only the reply clause is built. Accepted natural location-first variants for the café and reading-at-home tasks.
- `lesson{Two,Six}.json`: repeated-verb questions explicitly request that question form. Removed the false blanket claim that 太 always needs 了, and the misleading claim that removing a degree word makes the sentence invalid.
- `lessonOne.json`: replaced the blanket claim that two verbs cannot stand together with the actual surname-expression error.
- Retained matching, sorting, story and listening formats: they test semantic relationships, uses, sequencing and recorded contrasts. No recordings or answer keys for listening changed.

## Verification

- Typecheck and lint: pass.
- Full suite: 1,096 passed, 0 failed. HTTP tests required local loopback access; the initial sandbox run blocked their listeners.
- Content validation: pass. Packs regenerated with `exportAuthoredContent.ts`.
- After final copy edits: grammar content, round-trip and answer-check regression tests, 26 passed, 0 failed.
- Jev lint: 0 violations; no configured rule applies to these files.
- Safe DEV UI Previews at measured CSS sizes 390×844 and 1440×1000: no horizontal overflow. Verified the cake/noodles build succeeds and 他很累 gets its meaning repair. No real progress was recorded.

## Unsure

- Safari was not checked separately.
