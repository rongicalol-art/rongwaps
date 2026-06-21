import { Flashcard } from '../data/flashcards';

export interface RankedExample {
  chinese: string;
  pinyin: string;
  english: string;
  sourceCardId: string;
  sourceFront: string;
  sourceBookId: number;
  sourceLessonId: number;
  rank: number;
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

export function extractSearchVariants(word: string): string[] {
  if (!word) return [];
  const parts = word.split('/').map(p => p.trim()).filter(Boolean);
  const variants = new Set<string>();
  
  for (const part of parts) {
    if (part.includes('(') && part.includes(')')) {
      const withOptional = part.replace(/\(|\)/g, ''); 
      const withoutOptional = part.replace(/\([^)]*\)/g, ''); 
      if (withOptional) variants.add(withOptional);
      if (withoutOptional) variants.add(withoutOptional);
    } else {
      variants.add(part);
    }
  }
  
  return Array.from(variants);
}

/**
 * Smartly prioritize and find sentences for a given word using the block ranking algorithm.
 * @param searchWord The word/phrase to search for in example sentences.
 * @param targetCardId The ID of the flashcard that we are finding examples for. 
 */
export function findSmartExamplesForWord(FLASHCARDS_DATA: Flashcard[], searchWord: string, targetCardId: string): RankedExample[] {
  const variants = extractSearchVariants(searchWord);
  
  const parseIdContext = (id: string) => {
    // Attempt normal format: b1l1-1-, or without part/trailing hyphens: b1l1-1 or b1_l1
    const match = id.match(/b(\d+)[-_]?l(\d+)(?:-(\d+))?/i);
    if (!match) return { book: 999, lesson: 999, part: 999 };
    return {
      book: parseInt(match[1], 10),
      lesson: parseInt(match[2], 10),
      part: match[3] ? parseInt(match[3], 10) : 1
    };
  };

  const targetContext = parseIdContext(targetCardId);
  const targetIndex = Math.max(0, FLASHCARDS_DATA.findIndex(c => c.id === targetCardId));
  const anchorCardId = getAnchorCardId(FLASHCARDS_DATA, targetIndex);

  const results: (RankedExample & { _sourceIndex: number })[] = [];

  FLASHCARDS_DATA.forEach((sourceCard, sourceIndex) => {
    if (!sourceCard.examples || sourceCard.examples.length === 0) return;

    // Fast path: find examples containing searchWord first, before expensive match
    const matchingExamples = sourceCard.examples.filter(ex => 
      ex.chinese && (ex.chinese.includes(searchWord) || variants.some(v => ex.chinese.includes(v)))
    );
    if (matchingExamples.length === 0) return;

    const sourceContext = parseIdContext(sourceCard.id);
    let rank = 5; // Default: Advance / Future Lessons
    
    if (anchorCardId && sourceCard.id === anchorCardId) {
      rank = 1; // 🥇 Same Block (The exact anchor)
    } else if (
      sourceContext.book === targetContext.book &&
      sourceContext.lesson === targetContext.lesson &&
      sourceContext.part === targetContext.part
    ) {
      rank = 2; // 🥈 Same Lesson Part, Different Block
    } else if (
      sourceContext.book === targetContext.book &&
      sourceContext.lesson === targetContext.lesson
    ) {
      rank = 3; // 🥉 Same Lesson, Different Part
    } else if (
      sourceContext.book < targetContext.book ||
      (sourceContext.book === targetContext.book && sourceContext.lesson < targetContext.lesson)
    ) {
      rank = 4; // 🏅 Previous Lessons
    } else {
      rank = 5; // 🏅 Advance Lessons
    }

    matchingExamples.forEach(ex => {
      results.push({
        chinese: ex.chinese,
        pinyin: ex.pinyin,
        english: ex.english,
        sourceCardId: sourceCard.id,
        sourceFront: sourceCard.front,
        sourceBookId: sourceContext.book,
        sourceLessonId: sourceContext.lesson,
        rank,
        _sourceIndex: sourceIndex
      });
    });
  });

  // Sort the results based on rankings and distances
  results.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank; // Primary sort by rank (1 to 5)
    }

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

    if (a.rank === 5) {
      // Rank 5: Advance Lessons
      // Prioritize closest future (lowest index)
      return a._sourceIndex - b._sourceIndex;
    }

    return 0;
  });

  // Clean up private properties
  return results.map(({ _sourceIndex, ...rest }) => rest);
}
