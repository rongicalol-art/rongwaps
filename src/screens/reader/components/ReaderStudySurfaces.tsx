import { StudySidePanel } from '../../../lib/widgets';
import { ReaderStudyPanel } from './ReaderStudyPanel';
import { ReaderStudyDrawer } from './ReaderStudyDrawer';
import type { ReaderStudyPanelProps } from './ReaderStudyPanel';

interface ReaderStudySurfacesProps {
  reading: ReaderStudyPanelProps['reading'];
  characterPreference: ReaderStudyPanelProps['characterPreference'];
  onOpenWord?: ReaderStudyPanelProps['onOpenWord'];
  onOpenGrammarPart?: ReaderStudyPanelProps['onOpenGrammarPart'];
  onLocateWord?: ReaderStudyPanelProps['onLocateWord'];
  onLocateGrammarPoint?: ReaderStudyPanelProps['onLocateGrammarPoint'];
  isStudySidePanelOpen: boolean;
  setIsStudySidePanelOpen: (open: boolean) => void;
  isStudyDrawerOpen: boolean;
  setIsStudyDrawerOpen: (open: boolean) => void;
  locatedWordId: string | null;
  locatedGrammarPointId: string | null;
}

/** Desktop study side panel plus the mobile slide-over drawer of the same guide. */
export function ReaderStudySurfaces({
  reading,
  characterPreference,
  onOpenWord,
  onOpenGrammarPart,
  onLocateWord,
  onLocateGrammarPoint,
  isStudySidePanelOpen,
  setIsStudySidePanelOpen,
  isStudyDrawerOpen,
  setIsStudyDrawerOpen,
  locatedWordId,
  locatedGrammarPointId,
}: ReaderStudySurfacesProps) {
  return (
    <>
      {isStudySidePanelOpen && (
        <StudySidePanel
          ariaLabel="Study Companion Panel"
          title="Study Guide"
          onClose={() => setIsStudySidePanelOpen(false)}
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
      )}

      {/* Slide-over Study Guide drawer for mobile (screens < lg); hidden from lg up where the side panel shows */}
      <ReaderStudyDrawer
        isOpen={isStudyDrawerOpen}
        onClose={() => setIsStudyDrawerOpen(false)}
        reading={reading}
        characterPreference={characterPreference}
        onOpenWord={onOpenWord}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateWord={onLocateWord}
        onLocateGrammarPoint={onLocateGrammarPoint}
      />
    </>
  );
}
