export interface ParentCharacterCourseCard {
  front: string;
  bookId: number;
  lessonId: number;
}

export interface CharacterCourseRank {
  bookId: number;
  lessonId: number;
}

export interface UsedAsGroups {
  courseParents: Array<{ character: string; bookId: number; lessonId: number }>;
  otherParents: string[];
}

/** Best (earliest) course occurrence per single character. */
export function buildCharacterCourseIndex(
  courseCards: ParentCharacterCourseCard[],
): Map<string, CharacterCourseRank> {
  const courseRank = new Map<string, CharacterCourseRank>();
  for (const card of courseCards) {
    if (Array.from(card.front).length !== 1) continue;
    const current = courseRank.get(card.front);
    if (!current || card.bookId < current.bookId || (card.bookId === current.bookId && card.lessonId < current.lessonId)) {
      courseRank.set(card.front, { bookId: card.bookId, lessonId: card.lessonId });
    }
  }
  return courseRank;
}

/**
 * Splits already-ranked parents into course characters (with their earliest
 * book/lesson) and non-course characters, preserving the incoming order so
 * active-book entries stay first and later books follow.
 */
export function partitionRankedParents(
  parents: string[],
  courseCards: ParentCharacterCourseCard[],
): UsedAsGroups {
  const courseRank = buildCharacterCourseIndex(courseCards);
  const courseParents: Array<{ character: string; bookId: number; lessonId: number }> = [];
  const otherParents: string[] = [];
  for (const character of parents) {
    const rank = courseRank.get(character);
    if (rank) courseParents.push({ character, ...rank });
    else otherParents.push(character);
  }
  return { courseParents, otherParents };
}

export function rankParentCharacters(
  parents: string[],
  courseCards: ParentCharacterCourseCard[],
  activeBookId?: number,
): string[] {
  const courseRank = buildCharacterCourseIndex(courseCards);

  return parents
    .map((character, sourceIndex) => ({ character, sourceIndex, course: courseRank.get(character) }))
    .sort((a, b) => {
      if (a.course && !b.course) return -1;
      if (!a.course && b.course) return 1;
      if (a.course && b.course) {
        const aActive = a.course.bookId === activeBookId;
        const bActive = b.course.bookId === activeBookId;
        if (aActive !== bActive) return aActive ? -1 : 1;
        if (a.course.bookId !== b.course.bookId) return a.course.bookId - b.course.bookId;
        if (a.course.lessonId !== b.course.lessonId) return a.course.lessonId - b.course.lessonId;
      }
      return a.sourceIndex - b.sourceIndex;
    })
    .map(({ character }) => character);
}
