import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../data/books';
import { useCharBreakdown } from '../../hooks/useCharBreakdown';
import { CharNodeItem } from './breakdown/CharNodeItem';
import { AiMnemonicCard } from './breakdown/AiMnemonicCard';

// Re-export these for backward compatibility
export { useCharBreakdown } from '../../hooks/useCharBreakdown';
export { AiMnemonicCard } from './breakdown/AiMnemonicCard';

function RootTree({
  char,
  accentBgClass,
  accentTextClass,
  buttonEdgeClass,
  onWordClick
}: {
  char: string;
  accentBgClass?: string;
  accentTextClass?: string;
  buttonEdgeClass?: string;
  onWordClick?: (char: string) => void;
}) {
  const data = useCharBreakdown(char);
  return (
    <div className="flex flex-col items-center w-full relative pt-2 px-4 sm:px-0">
       <div className="w-full flex flex-col relative z-10 gap-6">
         <div className="flex flex-col w-full bg-white border-[3px] border-[#E5E5E5] border-b-[6px] rounded-[24px] sm:rounded-[28px] overflow-hidden z-10 relative">
           <CharNodeItem 
             char={char} 
             isRoot={true} 
             initiallyExpanded={true}
             accentBgClass={accentBgClass}
             accentTextClass={accentTextClass}
             onWordClick={onWordClick}
           />
         </div>
         <AiMnemonicCard
           char={char}
           data={data}
           accentBgClass={accentBgClass}
           accentTextClass={accentTextClass}
           buttonEdgeClass={buttonEdgeClass}
           compact
         />
       </div>
    </div>
  );
}

export function CharacterBreakdown({
  character,
  selectedCharIndex = 0,
  onWordClick
}: {
  character: string;
  selectedCharIndex?: number;
  onWordClick?: (char: string) => void;
}) {
  const chars = Array.from(character || '').filter(c => c.trim().length > 0);
  if (chars.length === 0) return null;
  const activeChar = chars[selectedCharIndex] || chars[0];

  const { activeBookId } = useAppStore();
  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  return (
    <div className="w-full flex flex-col items-center">
       <RootTree 
         char={activeChar} 
         accentBgClass={activeBook.accentBg} 
         accentTextClass={activeBook.accent} 
         buttonEdgeClass={activeBook.buttonEdge} 
         onWordClick={onWordClick}
       />
    </div>
  );
}
