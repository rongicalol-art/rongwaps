import type { LessonPartSelectionMap, ReadingRecord } from '../types/models';
import { getLessonSelectionKey } from './lessonPartSelection';

export interface ResolveReadingTargetParams {
  bookId: number;
  selectedLessons: number[];
  selectedLessonParts: LessonPartSelectionMap;
  readings: ReadingRecord[];
}

/**
 * Resolves the reading index corresponding to the user's active curriculum state.
 * If the user is on Part 2, Dialogue 2 will be targeted.
 * Otherwise (Part 1, Part 3, 'all', or unselected), Dialogue 1 is targeted.
 */
export function resolveActiveReadingIndex({
  bookId,
  selectedLessons,
  selectedLessonParts,
  readings,
}: ResolveReadingTargetParams): number {
  if (!readings || readings.length === 0) return 0;

  const bookReadings = readings.filter((r) => r.bookId === bookId);
  const targetReadings = bookReadings.length > 0 ? bookReadings : readings;

  // Determine target lesson
  const availableLessonIds = new Set(targetReadings.map((r) => r.lessonId));
  const activeLessonId = selectedLessons.find((id) => availableLessonIds.has(id))
    ?? targetReadings[0]?.lessonId
    ?? 1;

  // Determine target dialogue (Part 2 -> Dialogue 2, otherwise Dialogue 1)
  const partSelection = selectedLessonParts[getLessonSelectionKey(bookId, activeLessonId)];
  const isPart2 = Array.isArray(partSelection) && partSelection.includes(2) && !partSelection.includes(1);
  const targetDialogueNumber = isPart2 ? 2 : 1;

  // Find exact reading match
  const exactIndex = readings.findIndex(
    (r) => r.bookId === bookId && r.lessonId === activeLessonId && r.dialogueNumber === targetDialogueNumber,
  );
  if (exactIndex !== -1) return exactIndex;

  // Fallback to any dialogue of the active lesson
  const lessonFallbackIndex = readings.findIndex(
    (r) => r.bookId === bookId && r.lessonId === activeLessonId,
  );
  if (lessonFallbackIndex !== -1) return lessonFallbackIndex;

  return 0;
}
