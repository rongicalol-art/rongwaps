import { useMemo } from 'react';
import type { ReadingRecord } from '../../../types/models';
import type { PhraseChunk } from '../../../utils/pinyin/rubyPinyin';
import {
  chunksForOccurrence,
  findVocabularyOccurrences,
  tokenizeReading,
  type ReadingScript,
} from '../../../utils/vocabulary/vocabularyMatching';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';

const NO_CHUNKS: ReadonlySet<PhraseChunk> = new Set();

/**
 * Maps this part's new words onto the chunks a reading canvas actually
 * renders, so they can be underlined while reading. Matching runs on the
 * shared variant/span matcher in the same script the canvas shows, and the
 * set is keyed by chunk identity (`PhraseChunk` objects are reused by the
 * canvas memos), so a multi-chunk pack compound like 珍珠奶茶 is marked as
 * one occurrence.
 */
export function useReaderNewWordChunks({
  reading,
  script,
  newWords,
  paragraphChunks,
}: {
  reading: ReadingRecord;
  script: ReadingScript;
  newWords: readonly ReaderStudyTargetWord[];
  /** Rendered word chunks per paragraph, in paragraph order. */
  paragraphChunks: readonly (readonly PhraseChunk[])[];
}): ReadonlySet<PhraseChunk> {
  return useMemo(() => {
    if (newWords.length === 0) return NO_CHUNKS;
    const runs = tokenizeReading(reading, script);
    const marked = new Set<PhraseChunk>();
    for (const word of newWords) {
      if (word.variants.length === 0) continue;
      for (const occurrence of findVocabularyOccurrences(runs, word.variants)) {
        const rendered = paragraphChunks[occurrence.paragraphIndex];
        if (!rendered) continue;
        for (const chunk of chunksForOccurrence(rendered, occurrence)) marked.add(chunk);
      }
    }
    return marked;
  }, [reading, script, newWords, paragraphChunks]);
}
