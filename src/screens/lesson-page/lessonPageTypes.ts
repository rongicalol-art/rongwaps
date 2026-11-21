import type { SampleWord } from '../landing/sampleWords';

/** A conversation line: tappable words, with plain strings for punctuation and untaught glue words. */
export type LessonPageLine = readonly (SampleWord | string)[];

/** One lesson page's public sample (generated into data/book-N.ts). */
export interface LessonPageData {
  title: readonly [en: string, zh: string];
  /** Words the lesson teaches in total. */
  wordCount: number;
  words: readonly SampleWord[];
  lines: readonly LessonPageLine[];
  grammar: readonly (readonly [title: string, pattern: string])[];
}

export type LessonPageBook = Readonly<Record<number, LessonPageData>>;
