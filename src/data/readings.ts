import type { ReadingRecord } from '../types/models';
import { INTERACTIVE_GRAMMAR_PARTS } from './interactiveGrammarPages';

/**
 * Reading data: one reading per authored dialogue (對話一 / 對話二), for lessons
 * 1–14. Derived directly from the grammar parts' dialogue records so the
 * dialogue text stays a single source of truth. Lessons 15–16 are out of
 * scope for now and deliberately excluded.
 */

export const READING_LESSON_MIN = 1;
export const READING_LESSON_MAX = 14;

export const ALL_READINGS: ReadingRecord[] = INTERACTIVE_GRAMMAR_PARTS
  .filter((part) => (
    part.bookId === 1
    && part.lessonId >= READING_LESSON_MIN
    && part.lessonId <= READING_LESSON_MAX
  ))
  .sort((left, right) => left.lessonId - right.lessonId || left.partId - right.partId)
  .map((part) => ({
    id: `B${part.bookId}L${String(part.lessonId).padStart(2, '0')}-R${String(part.partId).padStart(2, '0')}`,
    bookId: part.bookId,
    lessonId: part.lessonId,
    dialogueNumber: part.partId as 1 | 2,
    title: part.dialogue.title,
    setting: part.dialogue.setting,
    printedPages: part.dialogue.printedPages,
    audioReference: part.dialogue.audioReference,
    paragraphs: part.dialogue.lines.map((line) => ({
      speaker: line.speaker,
      traditional: line.text.traditional,
      simplified: line.text.simplified ?? line.text.traditional,
      pinyin: line.text.pinyin ?? '',
      english: line.text.english ?? '',
    })),
  }));

export function getReadingsForBook(bookId: number): ReadingRecord[] {
  return ALL_READINGS.filter((reading) => reading.bookId === bookId);
}

export function getReadingsForLesson(bookId: number, lessonId: number): ReadingRecord[] {
  return ALL_READINGS.filter(
    (reading) => reading.bookId === bookId && reading.lessonId === lessonId,
  );
}
