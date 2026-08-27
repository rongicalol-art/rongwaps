import { Flashcard } from '../data/flashcards';
import { parseVocabularyId } from './vocabularyId';

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

interface CurriculumPosition {
  bookId: number;
  lessonId: number;
  partId: number;
  itemId?: number;
}

function getCardPosition(card: Pick<Flashcard, 'id' | 'bookId' | 'lessonId' | 'partId'>): CurriculumPosition | null {
  const parsed = parseVocabularyId(card.id);
  const bookId = card.bookId || parsed?.bookId || 0;
  const lessonId = card.lessonId || parsed?.lessonId || 0;
  const partId = card.partId || parsed?.partId || 0;

  if (![bookId, lessonId, partId].every((value) => Number.isSafeInteger(value) && value > 0)) {
    return null;
  }

  return { bookId, lessonId, partId, itemId: parsed?.itemId };
}

function getIdPosition(id: string): CurriculumPosition | null {
  const parsed = parseVocabularyId(id);
  if (!parsed || parsed.bookId <= 0 || parsed.lessonId <= 0 || parsed.partId <= 0) return null;
  return parsed;
}

/**
 * Whether a source card sits at or before the target's curriculum position.
 * This no longer gates inclusion — later sources still appear — it decides
 * whether the source ranks as "previous" (rank 4) or "other" (rank 5).
 * Examples from later books, lessons, or Parts are never dropped.
 */
export function isExampleSourceAvailable(targetCardId: string, sourceCard: Flashcard): boolean {
  const target = getIdPosition(targetCardId);
  const source = getCardPosition(sourceCard);
  if (!target || !source) return false;

  if (source.bookId !== target.bookId) return source.bookId < target.bookId;
  if (source.lessonId !== target.lessonId) return source.lessonId < target.lessonId;
  return source.partId <= target.partId;
}

/**
 * Helper to determine the block anchor for a given target index.
 * A block is defined as a sequence of cards in the same Part, ending with a card that has examples.
 * If the target itself has examples, it is its own anchor.
 * If the target has no examples, it searches forward in the SAME PART for the first card with examples.
 */
function getAnchorCardId(FLASHCARDS_DATA: Flashcard[], targetIndex: number): string | null {
  const targetCard = FLASHCARDS_DATA[targetIndex];
  if (!targetCard) return null;
  
  if (targetCard.examples && targetCard.examples.length > 0) {
    return targetCard.id;
  }

  const parseId = (id: string) => {
    const match = id.match(/b(\d+)l(\d+)-(\d+)-/i);
    if (!match) return null;
    return { book: match[1], lesson: match[2], part: match[3] };
  };

  const targetParsed = parseId(targetCard.id);
  if (!targetParsed) return null;

  for (let i = targetIndex + 1; i < FLASHCARDS_DATA.length; i++) {
    const card = FLASHCARDS_DATA[i];
    const parsed = parseId(card.id);
    // Break if we leave the current part
    if (!parsed || parsed.book !== targetParsed.book || parsed.lesson !== targetParsed.lesson || parsed.part !== targetParsed.part) {
      break;
    }
    // Found the anchor
    if (card.examples && card.examples.length > 0) {
      return card.id;
    }
  }

  return null;
}

/**
 * The example request is usually a filtered source pool, so the target card
 * may not be present in it. In that case, use the first same-Part source card
 * at or after the target's item position as the current block anchor.
 */
function getAnchorCardIdForTarget(
  cards: Flashcard[],
  targetCardId: string,
  targetContext: CurriculumPosition,
): string | null {
  const targetIndex = cards.findIndex((card) => card.id === targetCardId);
  if (targetIndex >= 0) return getAnchorCardId(cards, targetIndex);
  if (targetContext.itemId === undefined) return null;

  return cards
    .filter((card) => card.examples && card.examples.length > 0)
    .map((card) => ({ card, position: getCardPosition(card) }))
    .filter(({ position }) => (
      position
      && position.bookId === targetContext.bookId
      && position.lessonId === targetContext.lessonId
      && position.partId === targetContext.partId
      && position.itemId !== undefined
      && position.itemId >= targetContext.itemId!
    ))
    .sort((a, b) => a.position!.itemId! - b.position!.itemId!)
    .at(0)?.card.id ?? null;
}

// Optional-group expansion is capped so a pathological entry cannot explode
// into hundreds of forms; beyond the cap only all-on and all-off are kept.
const MAX_OPTIONAL_GROUPS = 3;

/**
 * Expand the optional groups of one slash-free form. Notation is ASCII after
 * NFKC normalization: `(一)點(兒)` means 一 and 兒 are optional, so every
 * combination is a real spoken form (一點兒, 一點, 點兒, 點).
 */
function expandOptionalGroups(form: string): string[] {
  const segments: string[] = [];
  let buffer = '';
  let index = 0;
  while (index < form.length) {
    if (form[index] === '(') {
      const close = form.indexOf(')', index + 1);
      if (close === -1) {
        buffer += form.slice(index);
        break;
      }
      segments.push(buffer);
      buffer = '';
      segments.push(form.slice(index + 1, close));
      index = close + 1;
    } else {
      buffer += form[index];
      index += 1;
    }
  }
  segments.push(buffer);

  const groupCount = (segments.length - 1) / 2;
  if (groupCount === 0) return [form];

  const forms = new Set<string>();
  if (groupCount > MAX_OPTIONAL_GROUPS) {
    // Too many combinations: keep the full form and the bare core only.
    forms.add(segments.join(''));
    forms.add(segments.filter((_, i) => i % 2 === 0).join(''));
  } else {
    for (let mask = 0; mask < 1 << groupCount; mask += 1) {
      let combined = '';
      for (let i = 0; i < segments.length; i += 1) {
        if (i % 2 === 0) combined += segments[i];
        else if (mask & (1 << ((i - 1) / 2))) combined += segments[i];
      }
      if (combined) forms.add(combined);
    }
  }
  return Array.from(forms);
}

/**
 * Expand a raw vocabulary form into every searchable variant.
 *
 * Notation handled:
 * - `/` means "or": 腳踏車/自行車 → both forms (multi-way and mixed scripts
 *   like 臺灣/台灣/台湾 are supported).
 * - `(...)` means "optional": 有(一)點(兒) → 有一點兒, 有一點, 有點兒, 有點.
 * - Combined forms: 車(子)/汽車 → 車子, 汽車, 車.
 *
 * Everything else (～, 、, …, ASCII letters) is kept literally. Returns
 * longest-first so callers that scan for "the form actually present" hit the
 * most specific match first.
 */
export function extractSearchVariants(word: string): string[] {
  if (!word) return [];
  const variants = new Set<string>();
  const parts = word.normalize('NFKC').split('/').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    for (const form of expandOptionalGroups(part)) {
      if (form) variants.add(form);
    }
  }
  return Array.from(variants).sort((a, b) => b.length - a.length);
}

/**
 * Every search form for a flashcard: the raw traditional and simplified forms
 * as authored (both scripts must be searched — a simplified sentence will
 * never contain the traditional form), plus the display front as a fallback.
 * Fully expanded and deduplicated, longest-first.
 */
export function extractWordVariants(front: string, traditional?: string, simplified?: string): string[] {
  const variants = new Set<string>();
  for (const form of [traditional, simplified, front]) {
    if (!form) continue;
    for (const variant of extractSearchVariants(form)) variants.add(variant);
  }
  return Array.from(variants).sort((a, b) => b.length - a.length);
}

/**
 * Smartly prioritize and find sentences for a given word using the block ranking algorithm.
 * @param searchWords The word/phrase(s) to search for — pass both the raw
 *   traditional and simplified forms so sentences in either script match.
 * @param targetCardId The ID of the flashcard that we are finding examples for.
 */
export function findSmartExamplesForWord(
  FLASHCARDS_DATA: Flashcard[],
  searchWords: string | string[],
  targetCardId: string,
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
    const matchingExamples = sourceCard.examples.filter(ex => {
      if (!ex.chinese) return false;
      return variantList.some(v => ex.chinese.includes(v));
    });
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
