import type { ReadingRecord } from '../types/models';
import { whenFontReady } from '../utils/browser/fontWarmup';
import { findReadingIndexForPart, findReadingIndicesForParts } from '../utils/lesson/readingContext';
import { loadInteractiveGrammarParts } from './hooks/useGrammarLauncher';
import { loadReadings } from './hooks/useReaderLauncher';

// What a Start button waits on before it opens a study window, so the window shows complete.
// Each warms the exact caches its window reads (the launchers and screenModules).

/** The grammar parts' content and the lesson screen. */
export function prepareGrammarOpen(partIds: string[]): Promise<unknown> {
  return loadInteractiveGrammarParts(partIds);
}

/** The Chinese text a reading window waits on before it shows (its font gate). */
export function readingFontText(readings: readonly ReadingRecord[]): string {
  return readings.map((reading) => reading.title + reading.paragraphs.map((p) => p.traditional + p.simplified).join('')).join('');
}

/** The book's readings, the reader screen and the selected parts' font. */
export async function prepareReadingOpen(target: { bookId: number; lessonId: number; partId: number | number[] }): Promise<void> {
  const readings = await loadReadings(target.bookId);
  const indices = Array.isArray(target.partId)
    ? findReadingIndicesForParts(readings, target.bookId, target.lessonId, target.partId)
    : [findReadingIndexForPart(readings, target.bookId, target.lessonId, target.partId)];
  await whenFontReady(readingFontText(indices.flatMap((index) => readings[index] ?? [])));
}
