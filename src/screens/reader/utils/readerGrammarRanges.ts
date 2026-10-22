/** A character range inside one reading paragraph. */
export interface ReaderGrammarRange {
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
}

/** Soft wash behind a grammar pattern in the summary's example lines. */
export const GRAMMAR_WASH_CLASS = 'bg-palette-purple/20';
