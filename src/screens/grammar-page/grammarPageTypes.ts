/** A word of a sentence: `key` marks the pattern's own word (呢 on the 呢 page). */
export type GrammarWord = readonly [hanzi: string, pinyin: string, meaning: string, key?: 1];

/** A sentence written for the page: its words, with plain strings for punctuation. */
export interface GrammarSentence {
  tokens: readonly (GrammarWord | string)[];
  pinyin: string;
  english: string;
}

/** One public grammar page (generated into data/book-N.ts). */
export interface GrammarPageData {
  slug: string;
  bookId: number;
  lessonId: number;
  title: string;
  /** The pattern's own words: 呢, or 叫、姓、是. */
  focus: string;
  /** The pattern as parts in order: Statement, new topic, 呢. */
  pattern: readonly string[];
  rule: string;
  examples: readonly GrammarSentence[];
  exercise: GrammarSentence;
}

/** What other pages need to link here without downloading the page (data/index.ts). */
export type GrammarPageLink = readonly [slug: string, bookId: number, lessonId: number, title: string];
