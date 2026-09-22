import type { GrammarConfusion } from '../../../types/models';
import { StudyDrawer } from '../../../lib/widgets';
import { GrammarConfusionPanel } from './GrammarConfusionPanel';

interface GrammarConfusionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  confusion: GrammarConfusion;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

/**
 * Phone-size "don't mix these up" window; `lg+` shows the same content in the
 * lesson's `StudySidePanel` column instead.
 */
export function GrammarConfusionDrawer({
  isOpen,
  onClose,
  confusion,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarConfusionDrawerProps) {
  return (
    <StudyDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={confusion.title}
      title={confusion.title}
      tone="canvas"
      closeLabel="Close don't mix these up"
    >
      <GrammarConfusionPanel
        confusion={confusion}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onOpenWord={onOpenWord}
      />
    </StudyDrawer>
  );
}
