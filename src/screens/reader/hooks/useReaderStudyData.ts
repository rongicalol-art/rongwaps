import { debugLogger } from '../../../utils/debug/debugLogger';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InteractiveGrammarPart, ReadingRecord } from '../../../types/models';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { fetchGrammarPack } from '../../../services/contentPacks';
import type { Flashcard } from '../../../data/flashcards';
import { buildReaderStudyTargets } from '../utils/readerStudyTargets';

export type { ReaderGrammarPoint, ReaderStudyTargetWord } from '../utils/readerStudyTargets';

interface UseReaderStudyDataOptions {
  reading: ReadingRecord;
}

/**
 * Loads the reader Study Guide's vocabulary and grammar, then hands both to
 * `buildReaderStudyTargets`, which owns the reading → course part mapping and
 * the "used in this reading" detection. This hook only fetches and exposes.
 */
export function useReaderStudyData({ reading }: UseReaderStudyDataOptions) {
  const [vocabulary, setVocabulary] = useState<Flashcard[]>([]);
  const [parts, setParts] = useState<InteractiveGrammarPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabError, setVocabError] = useState<string | null>(null);
  // Bumped by the card's retry control to re-run the vocabulary load.
  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setVocabError(null);

    fetchVocabulary(reading.bookId, reading.lessonId)
      .then((cards) => {
        if (cancelled) return;
        setVocabulary(cards);
      })
      .catch((err) => {
        debugLogger.error('App', 'Failed to load study guide vocabulary:', err);
        if (cancelled) return;
        // A failed fetch must not read as "this dialogue has no vocabulary":
        // drop the words so the card shows a retryable error, not an empty list.
        setVocabulary([]);
        setVocabError("Couldn't load this dialogue's vocabulary. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reading.bookId, reading.lessonId, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    void fetchGrammarPack(reading.bookId)
      .then((grammarParts) => {
        if (cancelled) return;
        const lessonParts = (grammarParts ?? []).filter(
          (part) => part.bookId === reading.bookId && part.lessonId === reading.lessonId,
        );
        setParts(lessonParts);
      })
      .catch((error: unknown) => {
        // Grammar points are supplementary to the study panel: the card keeps
        // its unchanged collapsed state instead of claiming the lesson has
        // none. Logged because the only visible symptom is a missing section,
        // and the likely cause is a lazy-chunk load failure (e.g. a deploy that
        // invalidated this chunk while the reader was open).
        debugLogger.error('App', 'Failed to load grammar points for the reader study panel:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [reading.bookId, reading.lessonId]);

  // Hovering a vocabulary row toggles locate state on the screen, which
  // re-renders this panel; keep the built targets referentially stable so the
  // reading's segmentation is not re-run on every hover.
  const { grammarPoints, targetWords, lessonWords, usingLessonFallback } = useMemo(
    () => buildReaderStudyTargets({ reading, parts, vocabulary }),
    [reading, parts, vocabulary],
  );

  return {
    grammarPoints,
    targetWords,
    lessonWords,
    usingLessonFallback,
    isLoading,
    vocabError,
    refetch,
  };
}
