import { useEffect, useMemo, useState } from 'react';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../../../services/contentPacks';
import { extractWordVariants } from '../../../utils/vocabulary/wordForms';
import type { CourseExampleRecord, ReadingRecord } from '../../../types/models';

/** Where a sentence comes from in the book: a dialogue line, the Reading, or a word's example. */
export type SentenceKind = 'dialogue' | 'reading' | 'example';

export interface LessonSentence {
  record: CourseExampleRecord;
  kind: SentenceKind;
  speaker?: string;
}

const KIND_BY_PREFIX: Record<string, SentenceKind> = { D: 'dialogue', R: 'reading', E: 'example' };
const KIND_ORDER: SentenceKind[] = ['dialogue', 'reading', 'example'];

/** The record id ends in its source block: `…-D01L03` (dialogue 1, line 3), `…-R01`, `…-E02`. */
function sentenceKind(id: string): SentenceKind {
  return KIND_BY_PREFIX[id.slice(id.lastIndexOf('-') + 1, id.lastIndexOf('-') + 2)] ?? 'example';
}

/** Collects a reading's lines by text, so dialogue sentences can show who says them. */
export function speakersByLine(readings: ReadonlyArray<ReadingRecord[] | null>): Map<string, string> {
  const speakers = new Map<string, string>();
  for (const pack of readings) for (const reading of pack ?? []) for (const line of reading.paragraphs ?? []) {
    if (line.speaker && line.traditional) speakers.set(line.traditional, line.speaker);
  }
  return speakers;
}

/** The records in these `book:lesson:part` keys, in book order (dialogue, Reading, examples), each sentence once. */
export function buildLessonSentences(records: readonly CourseExampleRecord[], parts: ReadonlySet<string>, speakers: ReadonlyMap<string, string>): LessonSentence[] {
  const seen = new Set<string>();
  const block = (id: string) => id.slice(id.lastIndexOf('-'));
  return records
    .filter((record) => parts.has(`${record.bookId}:${record.lessonId}:${record.partId}`))
    .map((record) => ({ record, kind: sentenceKind(record.id) }))
    .sort((a, b) => a.record.bookId - b.record.bookId
      || a.record.lessonId - b.record.lessonId
      || a.record.partId - b.record.partId
      || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
      || block(a.record.id).localeCompare(block(b.record.id))
      || a.record.id.localeCompare(b.record.id))
    .filter(({ record }) => !seen.has(record.traditional) && Boolean(seen.add(record.traditional)))
    .map((sentence) => ({ ...sentence, speaker: sentence.kind === 'dialogue' ? speakers.get(sentence.record.traditional) : undefined }));
}

/**
 * The book's sentences for the deck's parts (dialogue lines, Reading, word examples), in book
 * order, each sentence once. Reading only: nothing here touches SRS.
 */
export function useLessonSentences(activeBookId: number, selectedLessons: number[], isReviewDeck = false, isLibraryDeck = false) {
  const { cards, isLoading: isLoadingDeck, error: deckError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [packs, setPacks] = useState<{ records: CourseExampleRecord[]; speakers: Map<string, string> } | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const bookIds = useMemo(() => [...new Set(cards.map((card) => card.bookId))].sort().join(','), [cards]);
  useEffect(() => {
    if (isLoadingDeck) return;
    let current = true;
    const books = bookIds ? bookIds.split(',').map(Number) : [];
    void Promise.all([fetchCourseExampleRecords(), ...books.map((bookId) => fetchReadingsPack(bookId))])
      .then(([records, ...readings]) => {
        if (!current) return;
        setPacks({ records, speakers: speakersByLine(readings) });
      })
      .catch((error) => { if (current) setLoadError(error); });
    return () => { current = false; };
  }, [bookIds, isLoadingDeck]);

  const sentences = useMemo(() => (packs ? buildLessonSentences(
    packs.records,
    new Set(cards.map((card) => `${card.bookId}:${card.lessonId}:${card.partId ?? 1}`)),
    packs.speakers,
  ) : []), [cards, packs]);

  /** The deck's words, every written form: highlighted wherever they occur. */
  const highlightTerms = useMemo(
    () => [...new Set(cards.flatMap((card) => extractWordVariants(card.front, card.traditional, card.simplified)))],
    [cards],
  );

  return {
    sentences,
    highlightTerms,
    isLoading: isLoadingDeck || (!packs && !loadError && !deckError),
    loadError: deckError || loadError,
  };
}
