import { useEffect, useMemo, useState } from 'react';
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

  // Concatenate all dialogue text to detect which target words appear in this dialogue
  const dialogueText = useMemo(() => {
    return reading.paragraphs
      .map((p) => `${p.traditional} ${p.simplified}`)
      .join(' ');
  }, [reading.paragraphs]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

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
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reading.bookId, reading.lessonId, dialogueText]);

  // Extract interactive grammar points for this lesson
  const [grammarPoints, setGrammarPoints] = useState<ReaderGrammarPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    void import('../../../data/interactiveGrammarPages').then(
      ({ getInteractiveGrammarPartsForLesson }) => {
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
      },
    );

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
  };
}
