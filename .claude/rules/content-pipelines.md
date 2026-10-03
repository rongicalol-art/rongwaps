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
- Grammar: source-first, reading-centered; source Reading stored once, grammar points grouped in the same Part. Read `docs/GRAMMAR_LESSON_TEMPLATE.md` + `DECISIONS.md` before changing grammar screens/data.
- Lesson design goal: creative, interactive, easier than the book while faithful to its source; beginners first; varied per lesson, not one repeated template.
- Course examples / matching: `docs/COURSE_EXAMPLES.md`. Audio/karaoke: `docs/reference/OFFICIAL_AUDIO_SOURCES.md`.
- Mnemonics use pre-cached static/DB data; learner-facing generation is disabled (`docs/DATABASE_SCHEMA.md`, `src/services/mnemonicCache.ts`).
- Scripts read secrets from env/config files only; never print them.
