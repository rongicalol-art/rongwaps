---
paths:
  - "content/**"
  - "scripts/**"
  - "public/data/**"
  - "src/data/**"
  - "tests/content/**"
  - "tests/pipeline/**"
---
# Content and pipeline rules

- `public/data/` packs are generated: regenerate with the npm script and commit the manifest with them. Reference content is pack-first (`public/data/...` → IndexedDB via `staticContentService`) with database fallbacks.
- After lesson or grammar content changes: `npm run content:validate`. Content QA: `jev:qa:words`, `jev:qa:grammar`.
- Course-example changes: `course-examples:preview`, then `jev:qa:course` (changed preview records by default), inspect its review queue against the OCR source and scans, regenerate with `course-examples:export`, then run the coverage and content tests (`docs/TESTING.md`, `docs/COURSE_EXAMPLES.md`).
- Jev is a judge, not an author. A model verdict never generates missing pinyin, rewrites source content, sets a verification flag, or bypasses a source or future-content guard, because the printed book is the only proof. Pinyin that sounds plausible is not pinyin checked against the page. Without the evidence, the record stays unverified.
- Jev QA caches must match the current evidence, question definitions and model; an old ID does not show that changed content was reviewed. Thresholds route reviews; they don't prove fidelity to the textbook.
- Grammar is source-first and reading-centred: the source Reading is stored once and grammar points are grouped in the same Part. Read `docs/GRAMMAR_LESSON_TEMPLATE.md` and `docs/DECISIONS.md` before changing grammar screens or data; authoring rules are in the `grammar-author` skill.
- Lessons aim to be creative, interactive and easier than the book while faithful to it; beginners first; varied per lesson, not one repeated template.
- Audio and karaoke: `docs/reference/OFFICIAL_AUDIO_SOURCES.md`.
- Mnemonics use pre-cached static and database data; learner-facing generation is disabled (`docs/DATABASE_SCHEMA.md`, `src/services/mnemonicCache.ts`).
- Scripts read secrets from env and config files and never print them.
- Simple definitions (`content/vocabulary/simpleDefinitions.json`) have their own rules: `.claude/rules/simple-definitions.md`.
