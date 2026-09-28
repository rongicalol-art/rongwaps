import type { Flashcard } from '../data/flashcards';
import { extractSearchVariants, sentenceMatchesForms } from './wordForms';
import {
  getAnchorCardIdForTarget,
  getCardPosition,
  getIdPosition,
  isExampleSourceAvailable,
} from './curriculumPosition';

export interface RankedExample {
  chinese: string;
  pinyin: string;
  english: string;
  sourceCardId: string;
  sourceFront: string;
  sourceBookId: number;
  sourceLessonId: number;
  sourcePartId: number;
  rank: number;
}

export type RankedExampleGroupId =
  | 'current-match'
  | 'this-lesson'
  | 'previous-lessons'
  | 'other-lessons';

export interface RankedExampleGroup {
  id: RankedExampleGroupId;
  label: string;
  examples: RankedExample[];
}

const RANKED_EXAMPLE_GROUPS: Array<Pick<RankedExampleGroup, 'id' | 'label'>> = [
  { id: 'current-match', label: 'Current match' },
  { id: 'this-lesson', label: 'This lesson' },
  { id: 'previous-lessons', label: 'Previous lessons' },
  { id: 'other-lessons', label: 'Other lessons' },
];

function getRankedExampleGroupId(rank: number): RankedExampleGroupId {
  if (rank === 1) return 'current-match';
  if (rank === 2 || rank === 3) return 'this-lesson';
  if (rank === 4) return 'previous-lessons';
  return 'other-lessons';
}

/**
 * Keeps the ranking contract in one place so the flashcard can present the
 * most useful context as a readable sequence instead of a flat sentence dump.
 * The helper preserves the order produced by findSmartExamplesForWord.
 */
export function groupRankedExamples(examples: readonly RankedExample[]): RankedExampleGroup[] {
  const groups = new Map<RankedExampleGroupId, RankedExampleGroup>(
    RANKED_EXAMPLE_GROUPS.map((group) => [group.id, { ...group, examples: [] }]),
  );

  examples.forEach((example) => {
    groups.get(getRankedExampleGroupId(example.rank))?.examples.push(example);
  });

  return RANKED_EXAMPLE_GROUPS
    .map(({ id }) => groups.get(id)!)
    .filter((group) => group.examples.length > 0);
}

/**
 * Smartly prioritize and find sentences for a given word using the block ranking algorithm.
 * @param searchWords The word/phrase(s) to search for — pass both the raw
 *   traditional and simplified forms so sentences in either script match.
 * @param targetCardId The ID of the flashcard that we are finding examples for.
 * @param pos The card's part of speech, so separable verb-object words match
 *   their split usage (找錢 → 找…錢).
 */
export function findSmartExamplesForWord(
  FLASHCARDS_DATA: Flashcard[],
  searchWords: string | string[],
  targetCardId: string,
  pos?: string,
): RankedExample[] {
  const words = Array.isArray(searchWords) ? searchWords : [searchWords];
  const variants = new Set<string>();
  for (const word of words) {
    for (const variant of extractSearchVariants(word)) variants.add(variant);
  }
  const variantList = Array.from(variants).sort((a, b) => b.length - a.length);

  const targetContext = getIdPosition(targetCardId);
  if (!targetContext || variantList.length === 0) return [];

  const targetIndex = FLASHCARDS_DATA.findIndex(c => c.id === targetCardId);
  const anchorCardId = getAnchorCardIdForTarget(FLASHCARDS_DATA, targetCardId, targetContext);

  const results: (RankedExample & { _sourceIndex: number; _matchLength: number })[] = [];

  FLASHCARDS_DATA.forEach((sourceCard, sourceIndex) => {
    if (!sourceCard.examples || sourceCard.examples.length === 0) return;

    // Longest-form matching: scan the expanded variants longest-first so a
    // sentence that contains the full form (一點兒) is never recorded as a
    // bare-char hit (點). `_matchLength` drives ordering within each group.
    const matchingExamples = sourceCard.examples.filter(ex => (
      sentenceMatchesForms(ex.chinese, variantList, pos)
    ));
    if (matchingExamples.length === 0) return;

    const sourceContext = getCardPosition(sourceCard);
    if (!sourceContext) return;

    // The whole course (books 1–4) is fair game: sources from the learner's
    // current or earlier curriculum rank as "previous", anything not yet
    // studied ranks as "other" instead of being dropped.
    let rank = isExampleSourceAvailable(targetCardId, sourceCard) ? 4 : 5;

    if (anchorCardId && sourceCard.id === anchorCardId) {
      rank = 1; // 🥇 Same Block (The exact anchor)
    } else if (
      sourceContext.bookId === targetContext.bookId &&
      sourceContext.lessonId === targetContext.lessonId &&
      sourceContext.partId === targetContext.partId
    ) {
      rank = 2; // 🥈 Same Lesson Part, Different Block
    } else if (
      sourceContext.bookId === targetContext.bookId &&
      sourceContext.lessonId === targetContext.lessonId
    ) {
      rank = 3; // 🥉 Same Lesson, Different Part
    } else if (
      sourceContext.bookId < targetContext.bookId ||
      (sourceContext.bookId === targetContext.bookId && sourceContext.lessonId < targetContext.lessonId)
    ) {
      rank = 4; // 🏅 Previous Lessons
    }

    matchingExamples.forEach(ex => {
      // First hit in longest-first order is the most specific form present.
      const matchLength = variantList.find(v => ex.chinese.includes(v))?.length ?? 0;
      results.push({
        chinese: ex.chinese,
        pinyin: ex.pinyin,
        english: ex.english,
        sourceCardId: sourceCard.id,
        sourceFront: sourceCard.front,
        sourceBookId: sourceContext.bookId,
        sourceLessonId: sourceContext.lessonId,
        sourcePartId: sourceContext.partId,
        rank,
        _sourceIndex: sourceIndex,
        _matchLength: matchLength,
      });
    });
  });

  // Sort the results based on rankings and distances. Within a rank group the
  // most specific form wins (longest match first), then the existing
  // proximity ordering decides.
  results.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank; // Primary sort by rank (1 to 5)
    }

    const lengthDelta = b._matchLength - a._matchLength;
    if (lengthDelta !== 0) return lengthDelta;

    if (a.rank === 2) {
      // Rank 2: Same Lesson Part, Different Block
      // Prioritize the cards that come *after* the target card first, then by distance
      const aIsAfter = a._sourceIndex > targetIndex;
      const bIsAfter = b._sourceIndex > targetIndex;
      
      if (aIsAfter && !bIsAfter) return -1;
      if (!aIsAfter && bIsAfter) return 1;
      
      const aDist = Math.abs(a._sourceIndex - targetIndex);
      const bDist = Math.abs(b._sourceIndex - targetIndex);
      return aDist - bDist;
    }

    if (a.rank === 3) {
      // Rank 3: Same Lesson, Different Part
      // Prioritize by absolute distance
      const aDist = Math.abs(a._sourceIndex - targetIndex);
      const bDist = Math.abs(b._sourceIndex - targetIndex);
      return aDist - bDist; // closer parts first
    }

    if (a.rank === 4) {
      // Rank 4: Previous Lessons
      // Prioritize closest previous (highest index, smallest target - source)
      return b._sourceIndex - a._sourceIndex;
    }

    // Rank 5: Other lessons (later books or lessons) — read in curriculum
    // order so the sentences progress naturally from Book 2 to Book 4.
    if (a.sourceBookId !== b.sourceBookId) return a.sourceBookId - b.sourceBookId;
    if (a.sourceLessonId !== b.sourceLessonId) return a.sourceLessonId - b.sourceLessonId;
    return a._sourceIndex - b._sourceIndex;
  });

  // Clean up private properties
  return results.map((result) => ({
    chinese: result.chinese,
    pinyin: result.pinyin,
    english: result.english,
    sourceCardId: result.sourceCardId,
    sourceFront: result.sourceFront,
    sourceBookId: result.sourceBookId,
    sourceLessonId: result.sourceLessonId,
    sourcePartId: result.sourcePartId,
    rank: result.rank,
  }));
}
