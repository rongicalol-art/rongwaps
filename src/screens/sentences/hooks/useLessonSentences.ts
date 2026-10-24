import { useEffect, useMemo, useState } from 'react';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { fetchCourseExampleRecords } from '../../../services/contentPacks';
import { extractWordVariants } from '../../../utils/vocabulary/wordForms';
import type { CourseExampleRecord } from '../../../types/models';

/** Where a sentence comes from in the book: a dialogue line, the Reading, or a word's example. */
export type SentenceKind = 'dialogue' | 'reading' | 'example';

export interface LessonSentence {
  record: CourseExampleRecord;
  kind: SentenceKind;
}

const KIND_BY_PREFIX: Record<string, SentenceKind> = { D: 'dialogue', R: 'reading', E: 'example' };
const KIND_ORDER: SentenceKind[] = ['dialogue', 'reading', 'example'];

/** The record id ends in its source block: `…-D01L03` (dialogue 1, line 3), `…-R01`, `…-E02`. */
function sentenceKind(id: string): SentenceKind {
  return KIND_BY_PREFIX[id.slice(id.lastIndexOf('-') + 1, id.lastIndexOf('-') + 2)] ?? 'example';
}

/** The records in these `book:lesson:part` keys, in book order (dialogue, Reading, examples), each sentence once. */
export function buildLessonSentences(records: readonly CourseExampleRecord[], parts: ReadonlySet<string>): LessonSentence[] {
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
    .filter(({ record }) => !seen.has(record.traditional) && Boolean(seen.add(record.traditional)));
}

/**
 * The book's sentences for the deck's parts (dialogue lines, Reading, word examples), in book
 * order, each sentence once. Reading only: nothing here touches SRS.
 */
export function useLessonSentences(activeBookId: number, selectedLessons: number[], isReviewDeck = false, isLibraryDeck = false) {
  const { cards, isLoading: isLoadingDeck, error: deckError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [records, setRecords] = useState<CourseExampleRecord[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    if (isLoadingDeck) return;
    let current = true;
    void fetchCourseExampleRecords()
      .then((loaded) => { if (current) setRecords(loaded); })
      .catch((error) => { if (current) setLoadError(error); });
    return () => { current = false; };
  }, [isLoadingDeck]);

  const sentences = useMemo(() => (records ? buildLessonSentences(
    records,
    new Set(cards.map((card) => `${card.bookId}:${card.lessonId}:${card.partId ?? 1}`)),
  ) : []), [cards, records]);

  /** The deck's words, every written form: highlighted wherever they occur. */
  const highlightTerms = useMemo(
    () => [...new Set(cards.flatMap((card) => extractWordVariants(card.front, card.traditional, card.simplified)))],
    [cards],
  );

  return {
    sentences,
    highlightTerms,
    isLoading: isLoadingDeck || (!records && !loadError && !deckError),
    loadError: deckError || loadError,
  };
}
