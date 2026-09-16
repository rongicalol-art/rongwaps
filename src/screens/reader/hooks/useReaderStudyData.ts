import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReadingRecord } from '../../../types/models';
import { fetchVocabulary } from '../../../services/vocabularyService';

export interface ReaderTargetWord {
  id: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  pos?: string;
  audio?: string;
  inDialogue: boolean;
}

export interface ReaderGrammarPoint {
  id: string;
  partId: string;
  grammarNumber: number;
  titleTraditional: string;
  titleEnglish: string;
  pattern: string;
  explanation: string;
  isCurrentPart: boolean;
}

interface UseReaderStudyDataOptions {
  reading: ReadingRecord;
}

export function useReaderStudyData({ reading }: UseReaderStudyDataOptions) {
  const [allLessonWords, setAllLessonWords] = useState<ReaderTargetWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabError, setVocabError] = useState<string | null>(null);
  // Bumped by the card's retry control to re-run the vocabulary load.
  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  // Concatenate all dialogue text to detect which target words appear in this dialogue
  const dialogueText = useMemo(() => {
    return reading.paragraphs
      .map((p) => `${p.traditional} ${p.simplified}`)
      .join(' ');
  }, [reading.paragraphs]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setVocabError(null);

    fetchVocabulary(reading.bookId, reading.lessonId)
      .then((cards) => {
        if (cancelled) return;
        const mapped: ReaderTargetWord[] = cards.map((card) => {
          const trad = card.traditional || card.front;
          const simp = card.simplified;
          const inDialogue =
            dialogueText.includes(trad) || (simp ? dialogueText.includes(simp) : false);

          return {
            id: card.id,
            traditional: trad,
            simplified: simp,
            pinyin: card.pinyin || '',
            english: card.back || '',
            pos: card.pos,
            audio: card.audio,
            inDialogue,
          };
        });

        setAllLessonWords(mapped);
      })
      .catch((err) => {
        console.error('Failed to load study guide vocabulary:', err);
        if (cancelled) return;
        // A failed fetch must not read as "this dialogue has no vocabulary":
        // drop the words so the card shows a retryable error, not an empty list.
        setAllLessonWords([]);
        setVocabError("Couldn't load this dialogue's vocabulary. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reading.bookId, reading.lessonId, dialogueText, reloadToken]);

  // Extract interactive grammar points for this lesson
  const [grammarPoints, setGrammarPoints] = useState<ReaderGrammarPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    void import('../../../data/interactiveGrammarPages')
      .then(({ getInteractiveGrammarPartsForLesson }) => {
        if (cancelled) return;
        const parts = getInteractiveGrammarPartsForLesson(reading.bookId, reading.lessonId);
        const targetPartId = reading.dialogueNumber; // Dialogue 1 -> Part 1, Dialogue 2 -> Part 2

        const points: ReaderGrammarPoint[] = [];
        for (const part of parts) {
          const isCurrentPart = part.partId === targetPartId;
          for (const page of part.grammarPages) {
            points.push({
              id: page.id,
              partId: part.id,
              grammarNumber: page.grammarNumber,
              titleTraditional: page.titleTraditional,
              titleEnglish: page.titleEnglish,
              pattern: page.pattern,
              explanation: page.explanation,
              isCurrentPart,
            });
          }
        }

        // Sort: current dialogue's grammar points first
        points.sort((a, b) => {
          if (a.isCurrentPart && !b.isCurrentPart) return -1;
          if (!a.isCurrentPart && b.isCurrentPart) return 1;
          return a.grammarNumber - b.grammarNumber;
        });

        setGrammarPoints(points);
      })
      .catch((error: unknown) => {
        // Grammar points are supplementary to the study panel: the card keeps
        // its unchanged collapsed state instead of claiming the lesson has
        // none. Logged because the only visible symptom is a missing section,
        // and the likely cause is a lazy-chunk load failure (e.g. a deploy that
        // invalidated this chunk while the reader was open).
        console.error('Failed to load grammar points for the reader study panel:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [reading.bookId, reading.lessonId, reading.dialogueNumber]);

  // Filter words: in dialogue vs all
  const wordsInDialogue = useMemo(() => {
    return allLessonWords.filter((w) => w.inDialogue);
  }, [allLessonWords]);

  return {
    allLessonWords,
    wordsInDialogue,
    grammarPoints,
    isLoading,
    vocabError,
    refetch,
  };
}
