import type { ReadingRecord } from '../../../types/models';
import type { ReaderGrammarPoint, ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { StudyDrawer } from '../../../lib/widgets';
import { ReaderStudyPanel } from './ReaderStudyPanel';

interface ReaderStudyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  onLocateWord?: (word: ReaderStudyTargetWord | null) => void;
  onLocateGrammarPoint?: (point: ReaderGrammarPoint | null) => void;
}

export function ReaderStudyDrawer({
  isOpen,
  onClose,
  reading,
  characterPreference,
  onOpenWord,
  onOpenGrammarPart,
  onLocateWord,
  onLocateGrammarPoint,
}: ReaderStudyDrawerProps) {
  return (
    <StudyDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Study Guide"
      title="Study Guide"
      tone="practice"
      closeLabel="Close study guide"
    >
      <ReaderStudyPanel
        reading={reading}
        characterPreference={characterPreference}
        onOpenWord={onOpenWord}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateWord={(word) => {
          onLocateWord?.(word);
          // The drawer covers the text, so locating always closes it.
          if (word) onClose();
        }}
        onLocateGrammarPoint={(point) => {
          onLocateGrammarPoint?.(point);
          if (point) onClose();
        }}
        locateMode="tap"
      />
    </StudyDrawer>
  );
}
