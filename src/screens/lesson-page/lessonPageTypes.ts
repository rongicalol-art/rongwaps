import type { SampleWord } from '../landing/sampleWords';

/** A conversation line: tappable words, with plain strings for punctuation and untaught glue words. */
export type LessonPageLine = readonly (SampleWord | string)[];

/** One word of a lesson's list, to read: no recording. */
export type LessonListWord = readonly [hanzi: string, pinyin: string, meaning: string];

/** One lesson page's public content (generated into data/book-N.ts). */
export interface LessonPageData {
  title: readonly [en: string, zh: string];
  /** Words the lesson teaches in total. */
  wordCount: number;
  /** A few words with their recording, to hear. */
  words: readonly SampleWord[];
  /** Every word the lesson teaches, in book order. */
  list: readonly LessonListWord[];
  lines: readonly LessonPageLine[];
  grammar: readonly (readonly [title: string, pattern: string])[];
}

export type LessonPageBook = Readonly<Record<number, LessonPageData>>;
