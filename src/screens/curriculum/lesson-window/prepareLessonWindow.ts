import { preloadPlayfulNavIcons } from '../../../lib/widgets';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../../../services/contentPacks';
import type { CourseLessonProgress } from '../../../types/models';
import { preloadImages } from '../../../utils/browser/preloadAssets';
import { lessonPictures } from './useLessonWindowParts';

/**
 * Resolves once the lesson window can open complete: its reading pack and example records
 * (titles, parts, which modes exist), every part's picture and the logos are in memory.
 */
export async function prepareLessonWindow(bookId: number, lesson: CourseLessonProgress): Promise<void> {
  const [readings] = await Promise.all([
    fetchReadingsPack(bookId),
    fetchCourseExampleRecords(),
    preloadPlayfulNavIcons(),
  ]);
  const lessonReadings = (readings ?? []).filter((reading) => reading.lessonId === lesson.id);
  const partIds = [...new Set([
    ...lesson.parts.map((part) => part.id),
    ...lessonReadings.map((reading) => reading.dialogueNumber),
  ])].sort((a, b) => a - b);
  const { illustrationsByPart, illustration, fallback } = lessonPictures(bookId, lesson.id, partIds, lessonReadings);
  await preloadImages([...Object.values(illustrationsByPart), illustration ?? fallback]);
}
