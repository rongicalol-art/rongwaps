import React from 'react';
import type { ReadingRecord } from '../../../types/models';
import type { ReaderGrammarPoint, ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { useReaderStudyData } from '../hooks/useReaderStudyData';
import { ReaderCompanionGrammarCard } from './ReaderCompanionGrammarCard';
import { ReaderCompanionVocabCard } from './ReaderCompanionVocabCard';
import type { ReaderLocateMode } from '../utils/readerLocate';

export interface ReaderStudyPanelProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  /** Highlights (or clears) a vocabulary word in the reading text. */
  onLocateWord?: (word: ReaderStudyTargetWord | null) => void;
  /** Highlights (or clears) a grammar point's sentence in the reading text. */
  onLocateGrammarPoint?: (point: ReaderGrammarPoint | null) => void;
  locateMode?: ReaderLocateMode;
  locatedWordId?: string | null;
  locatedGrammarPointId?: string | null;
}

export const ReaderStudyPanel = React.memo(function ReaderStudyPanel({
  reading,
  characterPreference,
  onOpenWord,
  onOpenGrammarPart,
  onLocateWord,
  onLocateGrammarPoint,
  locateMode = 'hover',
  locatedWordId = null,
  locatedGrammarPointId = null,
}: ReaderStudyPanelProps) {
  const {
    grammarPoints,
    targetWords,
    lessonWords,
    usingLessonFallback,
    isLoading,
    vocabError,
    refetch,
  } = useReaderStudyData({ reading });

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Bento Card 1: Grammar in this Dialogue */}
      <ReaderCompanionGrammarCard
        grammarPoints={grammarPoints}
        dialogueNumber={reading.dialogueNumber}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateGrammarPoint={onLocateGrammarPoint}
        locateMode={locateMode}
        locatedGrammarPointId={locatedGrammarPointId}
      />

      {/* Bento Card 2: Target Vocabulary */}
      <ReaderCompanionVocabCard
        targetWords={targetWords}
        lessonWords={lessonWords}
        usingLessonFallback={usingLessonFallback}
        characterPreference={characterPreference}
        isLoading={isLoading}
        error={vocabError}
        onRetry={refetch}
        onOpenWord={onOpenWord}
        onLocateWord={onLocateWord}
        locateMode={locateMode}
        locatedWordId={locatedWordId}
      />
    </div>
  );
});
