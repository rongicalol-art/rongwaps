import { StudySidePanel } from '../../../lib/widgets';
import { ReaderStudyPanel } from './ReaderStudyPanel';
import type { ReaderStudyPanelProps } from './ReaderStudyPanel';

interface ReaderStudySidePanelProps {
  reading: ReaderStudyPanelProps['reading'];
  characterPreference: ReaderStudyPanelProps['characterPreference'];
  onOpenWord?: ReaderStudyPanelProps['onOpenWord'];
  onOpenGrammarPart?: ReaderStudyPanelProps['onOpenGrammarPart'];
  onLocateWord?: ReaderStudyPanelProps['onLocateWord'];
  onLocateGrammarPoint?: ReaderStudyPanelProps['onLocateGrammarPoint'];
  onClose: () => void;
  locatedWordId: string | null;
  locatedGrammarPointId: string | null;
}

/**
 * Desktop study side panel. Lives INSIDE the reading row beside the text
 * column — it owns width there, never height; rendering it as a column
 * sibling of the row collapses the reading column (regression fixed here).
 */
export function ReaderStudySidePanel({
  reading,
  characterPreference,
  onOpenWord,
  onOpenGrammarPart,
  onLocateWord,
  onLocateGrammarPoint,
  onClose,
  locatedWordId,
  locatedGrammarPointId,
}: ReaderStudySidePanelProps) {
  return (
    <StudySidePanel
      ariaLabel="Study Companion Panel"
      title="Study Guide"
      onClose={onClose}
      closeLabel="Hide study guide"
    >
      <ReaderStudyPanel
        reading={reading}
        characterPreference={characterPreference}
        onOpenWord={onOpenWord}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateWord={onLocateWord}
        onLocateGrammarPoint={onLocateGrammarPoint}
        locatedWordId={locatedWordId}
        locatedGrammarPointId={locatedGrammarPointId}
        showCloseButton={false}
      />
    </StudySidePanel>
  );
}
