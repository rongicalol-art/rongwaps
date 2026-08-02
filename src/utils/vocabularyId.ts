export interface VocabularyIdLocation {
  bookId: number;
  lessonId: number;
  partId: number;
  itemId?: number;
}

// Current database IDs look like B1L01-2-04. Separators are intentionally
// permissive so padded IDs and future exports keep working.
const VOCABULARY_ID_PATTERN = /^B0*(\d+)[-_]?L0*(\d+)(?:[-_](\d+))?(?:[-_](\d+))?$/i;

export function parseVocabularyId(value: unknown): VocabularyIdLocation | null {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(VOCABULARY_ID_PATTERN);
  if (!match) return null;

  const bookId = Number(match[1]);
  const lessonId = Number(match[2]);
  const partId = match[3] ? Number(match[3]) : 1;
  const itemId = match[4] ? Number(match[4]) : undefined;

  if (![bookId, lessonId, partId].every(Number.isSafeInteger)) return null;
  if (bookId < 0 || lessonId < 0 || partId < 1) return null;

  return { bookId, lessonId, partId, itemId };
}
