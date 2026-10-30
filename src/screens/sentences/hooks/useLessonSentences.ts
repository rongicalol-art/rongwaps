import { useEffect, useMemo, useState } from 'react';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { fetchCourseExampleRecords, fetchDialogueAlignmentPack, fetchPackedFlashcardExtras, fetchReadingsPack } from '../../../services/contentPacks';
import { exampleSentenceRecords, readingSentenceRecords } from '../utils/bookSentences';
import type { Flashcard } from '../../../data/flashcards';
import { extractWordVariants } from '../../../utils/vocabulary/wordForms';
import type { CourseExampleRecord } from '../../../types/models';
import { useAppStore } from '../../../store/useAppStore';

/** Where a sentence comes from in the book: a dialogue line, the Reading / essay, or a word's own example (the default). */
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

/** The records in these `book:lesson:part` keys, in book order (dialogue, Reading, examples), each sentence once. Without `includeReadings`, only the lessons' authored examples. */
export function buildLessonSentences(records: readonly CourseExampleRecord[], parts: ReadonlySet<string>, includeReadings = false): LessonSentence[] {
  const seen = new Set<string>();
  const block = (id: string) => id.slice(id.lastIndexOf('-'));
  return records
    .filter((record) => parts.has(`${record.bookId}:${record.lessonId}:${record.partId}`))
    .map((record) => ({ record, kind: sentenceKind(record.id) }))
    .filter(({ kind }) => includeReadings || kind === 'example')
    .sort((a, b) => a.record.bookId - b.record.bookId
      || a.record.lessonId - b.record.lessonId
      || a.record.partId - b.record.partId
      || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
      || block(a.record.id).localeCompare(block(b.record.id))
      || a.record.id.localeCompare(b.record.id))
    .filter(({ record }) => !seen.has(record.traditional) && Boolean(seen.add(record.traditional)));
}

/**
 * Course-example records can cover only some lessons. Always include the selected words' own
 * examples; books without course records also need their dialogue lines built from readings.
 */
export async function loadSentenceRecords(cards: readonly Flashcard[]): Promise<CourseExampleRecord[]> {
  const records = await fetchCourseExampleRecords();
  const extras = await Promise.all(cards.map((card) => fetchPackedFlashcardExtras(card)));
  const covered = new Set(records.map((record) => record.bookId));
  const otherBooks = [...new Set(cards.map((card) => card.bookId))].filter((bookId) => !covered.has(bookId));
  const built = await Promise.all(otherBooks.map(async (bookId) => {
    const [readings, alignments] = await Promise.all([
      fetchReadingsPack(bookId),
      fetchDialogueAlignmentPack(bookId),
    ]);
    return readingSentenceRecords(readings ?? [], alignments);
  }));
  return [...records, ...built.flat(), ...exampleSentenceRecords(cards, extras)];
}

/**
 * The book's sentences for the deck's parts: the words' authored examples, plus the dialogue lines and
 * Reading when the "Include reading sentences" setting is on, in book order, each sentence once. Reading only: nothing here touches SRS.
 */
export function useLessonSentences(activeBookId: number, selectedLessons: number[], isReviewDeck = false, isLibraryDeck = false) {
  const { cards, isLoading: isLoadingDeck, error: deckError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const includeReadings = useAppStore((state) => state.sentencesIncludeReadings);
  const [records, setRecords] = useState<CourseExampleRecord[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    if (isLoadingDeck) return;
    let current = true;
    void loadSentenceRecords(cards)
      .then((loaded) => { if (current) setRecords(loaded); })
      .catch((error) => { if (current) setLoadError(error); });
    return () => { current = false; };
  }, [cards, isLoadingDeck]);

  const sentences = useMemo(() => (records ? buildLessonSentences(
    records,
    new Set(cards.map((card) => `${card.bookId}:${card.lessonId}:${card.partId ?? 1}`)),
    includeReadings,
  ) : []), [cards, records, includeReadings]);

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
