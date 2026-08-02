import { useState } from 'react';
import { useCharBreakdown, AiMnemonicCard, CharacterBreakdown } from './CharacterBreakdown';
import { SAMPLE_BOOKS } from '../../data/books';
import { BottomDrawer } from './BottomDrawer';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { WorkspaceDetailShell } from './WorkspaceDetailShell';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

export function getComponentsInfo(decomposition: string | null | undefined) {
  if (!decomposition) return { components: [], ids: null };
  const chars = Array.from(decomposition);
  const idsRegex = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻]/;
  const idsChar = chars.find(c => idsRegex.test(c)) || null;
  const components = chars.filter(c => !idsRegex.test(c) && !/[\s！？?]/.test(c));
  return { components, ids: idsChar };
}

interface DeepBreakdownModalProps {
  initialChar: string;
  onClose: () => void;
  activeBook: CourseBook;
  onWordClick?: (char: string) => void;
}

export function DeepBreakdownModal({ initialChar, onClose, activeBook, onWordClick }: DeepBreakdownModalProps) {
  const [showAiMnemonic, setShowAiMnemonic] = useState(false);
  const charData = useCharBreakdown(initialChar);
  return (
    <WorkspaceDetailShell
      ariaLabel={`Component tree for ${initialChar}`}
      title="Component tree"
      onClose={onClose}
      maxWidthClassName="max-w-[900px]"
      contentInnerClassName="pb-24"
      rightAction={
        <IconActionButton
          onClick={() => setShowAiMnemonic(true)}
          className="relative z-30 -mr-1 text-amber-500 hover:text-amber-600"
          label="Show memory hook"
          icon={<AppIcon name="lightbulb" size={24} />}
          size="lg"
        />
      }
    >
      <CharacterBreakdown character={initialChar} selectedCharIndex={0} onWordClick={onWordClick} />

      <BottomDrawer isOpen={showAiMnemonic} onClose={() => setShowAiMnemonic(false)}>
        <div className="px-4 pb-6 pt-2">
          <AiMnemonicCard
            char={initialChar}
            data={charData}
            accentBgClass={activeBook.accentBg}
            accentTextClass={activeBook.accent}
            buttonEdgeClass={activeBook.buttonEdge}
          />
        </div>
      </BottomDrawer>
    </WorkspaceDetailShell>
  );
}
