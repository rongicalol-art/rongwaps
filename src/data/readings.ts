import type { ReadingRecord } from '../types/models';
import { ALL_READINGS_DATA } from './readingsData';

/**
 * Reading data: one reading per authored dialogue (對話一 / 對話二), for lessons
 * 1–16.
 */

export const READING_LESSON_MIN = 1;
export const READING_LESSON_MAX = 16;

export const ALL_READINGS: ReadingRecord[] = ALL_READINGS_DATA;

export function getReadingsForBook(bookId: number): ReadingRecord[] {
  return ALL_READINGS.filter((reading) => reading.bookId === bookId);
}

export function getReadingsForLesson(bookId: number, lessonId: number): ReadingRecord[] {
  return ALL_READINGS.filter(
    (reading) => reading.bookId === bookId && reading.lessonId === lessonId,
  );
}
