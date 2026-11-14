---
paths:
  - "content/vocabulary/**"
  - "scripts/content/lintSimpleDefinitions.ts"
---
# Simple definitions (`content/vocabulary/simpleDefinitions.json`)

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
