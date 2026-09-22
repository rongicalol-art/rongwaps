import { useMemo } from 'react';
import type { ReadingRecord } from '../../../types/models';
import type { PhraseChunk } from '../../../utils/rubyPinyin';
import {
  chunksForOccurrence,
  findVocabularyOccurrences,
  tokenizeReading,
  type ReadingScript,
} from '../../../utils/vocabularyMatching';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';

export interface ReaderLocateResult {
  /** Rendered chunks belonging to the located word; multi-chunk compounds included. */
  locatedChunks: ReadonlySet<PhraseChunk>;
  /** Paragraph of the first occurrence; the view scrolls it into view. */
  firstParagraphIndex: number | null;
}

const NOTHING_LOCATED: ReaderLocateResult = { locatedChunks: new Set(), firstParagraphIndex: null };

/**
 * Maps the Study Guide's located vocabulary word onto the chunks a reading
 * canvas actually renders. Matching runs on the shared variant/span matcher in
 * the same script the canvas shows, and the resulting set is keyed by chunk
 * identity (`PhraseChunk` objects are reused by the canvas memos), so a
 * multi-chunk pack compound like 珍珠奶茶 lights up as one occurrence.
 */
export function useReaderLocate({
  reading,
  script,
  locatedWord,
  paragraphChunks,
}: {
  reading: ReadingRecord;
  script: ReadingScript;
  locatedWord: ReaderStudyTargetWord | null;
  /** Rendered word chunks per paragraph, in paragraph order. */
  paragraphChunks: readonly (readonly PhraseChunk[])[];
}): ReaderLocateResult {
  return useMemo(() => {
    if (!locatedWord || locatedWord.variants.length === 0) return NOTHING_LOCATED;

    const occurrences = findVocabularyOccurrences(
      tokenizeReading(reading, script),
      locatedWord.variants,
    );
    if (occurrences.length === 0) return NOTHING_LOCATED;

    const locatedChunks = new Set<PhraseChunk>();
    for (const occurrence of occurrences) {
      const chunks = paragraphChunks[occurrence.paragraphIndex];
      if (!chunks) continue;
      for (const chunk of chunksForOccurrence(chunks, occurrence)) {
        locatedChunks.add(chunk);
      }
    }

    return { locatedChunks, firstParagraphIndex: occurrences[0].paragraphIndex };
  }, [reading, script, locatedWord, paragraphChunks]);
}
