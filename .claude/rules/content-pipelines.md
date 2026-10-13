---
paths:
  - "scripts/**"
  - "public/data/**"
  - "src/data/**"
  - "tests/content/**"
  - "tests/pipeline/**"
---
# Content & pipeline rules

- `public/data/` packs are generated. Regenerate via the npm script, commit manifests with them; never hand-edit.
- Reference content is pack-first (`public/data/...` → IndexedDB via `staticContentService`) with DB fallbacks.
- After lesson/grammar content changes: `npm run content:validate`. Content QA: `jev:qa:words`, `jev:qa:grammar`.
- Course-example changes: run `course-examples:preview`, then `jev:qa:course` (changed preview records by default), inspect its review queue against the OCR source/scans, then regenerate with `course-examples:export` and run coverage/content tests. See `docs/TESTING.md`.
- Jev is a judge: never generate missing pinyin, rewrite source content, set verification flags, or bypass source/future-content guards from a model verdict. Linguistic pinyin plausibility is separate from visual verification against the printed source. If required evidence is unavailable, leave the record unverified.
- Jev QA caches must match the current evidence, question definitions, and requested model. Old IDs alone never establish that changed content was reviewed. Thresholds are review-routing settings, not proof of textbook fidelity.
- Grammar: source-first, reading-centered; source Reading stored once, grammar points grouped in the same Part. Read `docs/GRAMMAR_LESSON_TEMPLATE.md` + `docs/DECISIONS.md` before changing grammar screens/data.
- Lesson design goal: creative, interactive, easier than the book while faithful to its source; beginners first; varied per lesson, not one repeated template.
- Course examples / matching: `docs/COURSE_EXAMPLES.md`. Audio/karaoke: `docs/reference/OFFICIAL_AUDIO_SOURCES.md`.
- Mnemonics use pre-cached static/DB data; learner-facing generation is disabled (`docs/DATABASE_SCHEMA.md`, `src/services/mnemonicCache.ts`).
- Scripts read secrets from env/config files only; never print them.

## Simple definitions (`content/vocabulary/simpleDefinitions.json`)

Shown by the "Simple definitions" preference instead of the textbook gloss. Audience: non-native English speakers; everyday English only.

1. Never harder than the `meaning` it replaces — the everyday word wins (continuously, not unceasingly; change, not alter; buy, not purchase).
2. Everyday-English ceiling: no literary, formal or technical words; the banned list lives in `scripts/content/lintSimpleDefinitions.ts`. Familiar abbreviations stay and get glossed: `ATM (cash machine)`, `MRT (subway)`, `PhD (doctorate)`, `RMB (Chinese yuan)`.
3. One core sense — the one taught in the lesson. No `/` between senses; a second sense only when the lesson needs it, joined with `;`.
4. POS: verbs start `to …`; measure words `measure word (people)`; particles keep the short label family (`yes-no particle`, `possessive particle`); adjectives and nouns plain.
5. Short: target ≤ 3 words; never longer than the `meaning` it replaces.
6. Plain English only: no idioms or translationese (`to teach school`, `take transit`, `silver lining`).
7. No two cards share the same simple gloss; same-lesson near-duplicates get qualified (`to learn` with 学习).
8. Faithful to the lesson examples; never invent a meaning. `meaning` is never edited — only `simple`.
9. Proper nouns capitalized; annotations only in the existing styles: `(M: 本 běn)`, `(bus/train)`, `(food)`.

After edits: `npm run vocab:simple` (regenerates packs + manifest), then `npm run vocab:simple:lint` — 0 errors.
