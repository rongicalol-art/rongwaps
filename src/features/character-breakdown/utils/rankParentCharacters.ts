export interface ParentCharacterCourseCard {
  front: string;
  bookId: number;
  lessonId: number;
}

export interface CharacterCourseRank {
  bookId: number;
  lessonId: number;
}

/**
 * Earliest course occurrence per character, counting characters met inside
 * course words too (matches the build-time learner pool).
 */
export function buildCharacterCourseIndex(
  courseCards: ParentCharacterCourseCard[],
): Map<string, CharacterCourseRank> {
  const courseRank = new Map<string, CharacterCourseRank>();
  for (const card of courseCards) {
    for (const character of new Set(Array.from(card.front))) {
      const current = courseRank.get(character);
      if (!current || card.bookId < current.bookId || (card.bookId === current.bookId && card.lessonId < current.lessonId)) {
        courseRank.set(character, { bookId: card.bookId, lessonId: card.lessonId });
      }
    }
  }
  return courseRank;
}
