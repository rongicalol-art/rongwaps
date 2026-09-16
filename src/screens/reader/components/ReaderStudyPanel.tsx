import React from 'react';
import type { ReadingRecord } from '../../../types/models';
import { useReaderStudyData } from '../hooks/useReaderStudyData';
import { ReaderCompanionSpeakersCard } from './ReaderCompanionSpeakersCard';
import { ReaderCompanionGrammarCard } from './ReaderCompanionGrammarCard';
import { ReaderCompanionVocabCard } from './ReaderCompanionVocabCard';

export interface ReaderStudyPanelProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onClose?: () => void;
  onOpenWord?: (word: string) => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  showCloseButton?: boolean;
}

export const ReaderStudyPanel = React.memo(function ReaderStudyPanel({
  reading,
  characterPreference,
  onClose,
  onOpenWord,
  onOpenGrammarPart,
  showCloseButton = true,
}: ReaderStudyPanelProps) {
  const { allLessonWords, wordsInDialogue, grammarPoints, isLoading, vocabError, refetch } =
    useReaderStudyData({ reading });

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Bento Card 1: Dialogue Speakers Block */}
      <ReaderCompanionSpeakersCard
        reading={reading}
        characterPreference={characterPreference}
        onClose={onClose}
        showCloseButton={showCloseButton}
      />

      {/* Bento Card 2: Grammar in this Dialogue */}
      <ReaderCompanionGrammarCard
        grammarPoints={grammarPoints}
        dialogueNumber={reading.dialogueNumber}
        onOpenGrammarPart={onOpenGrammarPart}
      />

      {/* Bento Card 3: Target Vocabulary */}
      <ReaderCompanionVocabCard
        allLessonWords={allLessonWords}
        wordsInDialogue={wordsInDialogue}
        characterPreference={characterPreference}
        isLoading={isLoading}
        error={vocabError}
        onRetry={refetch}
        onOpenWord={onOpenWord}
      />
    </div>
  );
});
