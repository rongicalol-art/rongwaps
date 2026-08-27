# Character Breakdown Handoff

## Current state

The redesigned Character Breakdown screen is implemented for the development-only V3 decomposition runtime. Production still selects the legacy runtime until a publishable/licensed V3 pack is available.

- V3 uses the full-coverage local candidate when present: `output/decomposition-runtime/phase4-full-coverage-candidate` (88,840 records).
- The main breakdown is a stable left-to-right, two-column summary. Expansion opens as a compact dropdown beneath its owning tile; there are no connector lines.
- `See tree` opens a separate screen. The user plans to redesign that screen later; do not fold the tree into the summary screen.
- The identity hero uses animated stroke order. Memory Hook sits directly below Breakdown. The character switcher appears only near the bottom.

## Data behavior

### Breakdown

- Structure comes from the V3 runtime service and lazy shard loading.
- Encoded glyphs remain real glyph nodes even when dictionary metadata is absent.
- Truly unencoded/unknown/source-only operands use the neutral Shape treatment.
- Encoded glyphs unsupported by the current browser font use the shared `Rare` fallback. Never show crossed boxes or visible `U+...` identifiers.
- Example: `愛` has direct children `爫`, `冖`, and encoded glyph `𢖻`; `𢖻` expands to `心` and `夊`. It is Rare on unsupported fonts, not Shape.

### Part of

- Uses the V3 reverse index: `getParents("g:{character}")`.
- Results are not limited to course vocabulary or the legacy breakdown table.
- Course characters are ranked first, but ranking must not remove any V3 parents.
- Example: `𦥯` has 41 recorded parents, including `學`.

### In words

- Combines course vocabulary with bounded dictionary search results.
- Course words remain first; dictionary-only words follow and are deduplicated.
- The summary renders four words. `See all` groups course results by book and dictionary-only results under Dictionary without fake book/lesson badges.
- Dictionary enrichment is capped at 30 server results, cached, and pending requests are deduplicated. It never forces the 1.9 MB local trie to download; the trie is only a fallback if already resident.
- Verified example: `愛` returns 35 merged words (11 course + 24 dictionary-only).

## Missing metadata and glyph handling

- `useCharBreakdownState` distinguishes loading from a completed lookup with no metadata, preventing permanent skeletons.
- Pinyin/definitions render only when present; empty labels and reserved blank lines are omitted.
- The shared glyph fallback is `src/features/character-breakdown/components/breakdown/CharacterGlyph.tsx` and is used by Breakdown, Part of, and the full parent list.

## Key files

- `src/features/character-breakdown/hooks/useSingleBreakdown.ts`
- `src/features/character-breakdown/components/v3/V3CharacterBreakdown.tsx`
- `src/features/character-breakdown/components/v3/V3RuntimeTree.tsx`
- `src/features/character-breakdown/components/v3/V3SupportingInformation.tsx`
- `src/features/character-breakdown/components/UsedAsListModal.tsx`
- `src/features/character-breakdown/components/RelatedWordsListModal.tsx`
- `src/features/character-breakdown/components/breakdown/CharacterGlyph.tsx`
- `src/features/character-breakdown/utils/rankParentCharacters.ts`
- `src/features/character-breakdown/utils/mergeBreakdownWords.ts`
- `src/features/character-decomposition/decompositionService.ts`
- `src/services/dictionaryService.ts`
- `src/hooks/useCharBreakdown.ts`
- `vite.config.ts`
- `tests/characterBreakdownV3.test.ts`

## Verification

Last verified successfully:

```bash
npm run lint
npm run typecheck
npm test       # 165 passing
npm run build
```

Browser checks covered desktop and 390×844 mobile layouts, V3 expansion, unsupported-glyph fallbacks, reverse parents, and course/dictionary word merging.

## Working-tree caution

The repository contains many unrelated existing edits and relocated/untracked files. Preserve them and scope any follow-up strictly to Character Breakdown. `docs/CHARACTER_DECOMPOSITION_PHASE6_UI_REBUILD.md` still describes In Words as vocabulary-only; this handoff reflects the current implementation.
