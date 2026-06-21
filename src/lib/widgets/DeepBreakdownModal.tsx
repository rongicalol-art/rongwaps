import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiXBold, PiCaretLeftBold, PiCaretRightBold, PiSparkleFill, PiSpinnerBold, PiLightbulbFill } from 'react-icons/pi';
import { useCharBreakdown, AiMnemonicCard, CharacterBreakdown } from './CharacterBreakdown';
import { DBCharacterBreakdown } from '../../types/database';
import { useAppStore } from '../../store/useAppStore';
import { Card3D } from './Card3D';
import { IconButton3D } from './IconButton3D';
import { SAMPLE_BOOKS } from '../../data/books';
import { BottomDrawer } from './BottomDrawer';
import { ScreenHeader } from './ScreenHeader';
import { numberToToneMarks } from '../../utils/pinyin';
import { Skeleton } from './Skeleton';
import { useCompactHeaderOnScroll } from '../../hooks/useCompactHeaderOnScroll';

export function getComponentsInfo(decomposition: string | null | undefined) {
  if (!decomposition) return { components: [], ids: null };
  const chars = Array.from(decomposition);
  const idsRegex = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻]/;
  const idsChar = chars.find(c => idsRegex.test(c)) || null;
  const components = chars.filter(c => !idsRegex.test(c) && !/[\s！？?]/.test(c));
  return { components, ids: idsChar };
}

const IdsMap: Record<string, string> = {
  '⿰': 'Left-Right',
  '⿱': 'Top-Bottom',
  '⿲': 'Left-Middle-Right',
  '⿳': 'Top-Middle-Bottom',
  '⿴': 'Full Surround',
  '⿵': 'Top Surround',
  '⿶': 'Bottom Surround',
  '⿷': 'Left Surround',
  '⿸': 'Top-Left Surround',
  '⿹': 'Top-Right Surround',
  '⿺': 'Bottom-Left Surround',
  '⿻': 'Overlaid',
};

interface DeepBreakdownModalProps {
  initialChar: string;
  onClose: () => void;
  activeBook: any;
  onWordClick?: (char: string) => void;
}

export function DeepBreakdownModal({ initialChar, onClose, activeBook, onWordClick }: DeepBreakdownModalProps) {
  const [showAiMnemonic, setShowAiMnemonic] = useState(false);
  const charData = useCharBreakdown(initialChar);
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[400] w-full h-full bg-[#F7F7F7] flex flex-col pointer-events-auto font-sans shadow-2xl"
    >
      <ScreenHeader 
        onClose={onClose}
        title="DEEP BREAKDOWN"
        compact={isHeaderCompact}
        rightAction={
          <button
            onClick={() => setShowAiMnemonic(true)}
            className="p-2 -mr-2 text-amber-400 hover:text-amber-500 transition-colors relative z-30"
            aria-label="Show memory hook"
            title="Memory Hook"
          >
            <PiLightbulbFill size={26} />
          </button>
        }
        className="bg-white border-b-[3px] border-[#E5E5E5] w-full max-w-full px-4 sm:px-6 shadow-sm z-10 shrink-0"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:py-8 custom-scrollbar relative pb-24" onScroll={handleHeaderScroll}>
        <div className="max-w-[768px] mx-auto w-full">
          <CharacterBreakdown character={initialChar} selectedCharIndex={0} onWordClick={onWordClick} />
        </div>
      </div>

      <BottomDrawer isOpen={showAiMnemonic} onClose={() => setShowAiMnemonic(false)}>
        <div className="pt-2 pb-6 px-4">
          <AiMnemonicCard 
             char={initialChar} 
             data={charData} 
             accentBgClass={activeBook.accentBg} 
             accentTextClass={activeBook.accent} 
             buttonEdgeClass={activeBook.buttonEdge} 
           />
        </div>
      </BottomDrawer>
    </motion.div>
  );
}

function ComponentPill({ char, onClick }: { char: string, onClick: () => void, key?: React.Key }) {
  const data = useCharBreakdown(char);
  const isUnknown = char === '？' || char === '?';
  const py = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : null;
  const def = data?.definition ? data.definition.split(';')[0].split(',')[0].toUpperCase() : null;

  const { components } = getComponentsInfo(data?.decomposition);
  const hasChildren = components.length > 1;
  const isLoading = !data && !isUnknown;

  return (
    <Card3D 
      className={`p-4 flex items-center justify-between transition-transform ${isUnknown ? 'opacity-50' : 'cursor-pointer hover:bg-[#FAFAFA] active:scale-[0.98]'}`}
      onClick={() => { if (!isUnknown) onClick(); }}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-[12px] bg-[#F7F7F7] border border-[#E5E5E5] font-chinese text-[28px] text-[#4B4B4B]">
          {char}
        </div>
        <div className="flex flex-col justify-center gap-1">
          <div className="text-[14px] font-black text-[#4B4B4B] tracking-widest min-w-12 flex items-center min-h-[16px]">
            {isLoading ? <Skeleton className="w-10 h-3 rounded-[3px]" /> : (py || '???')}
          </div>
          <div className="text-[12px] font-bold text-[#AFB6BB] uppercase line-clamp-1 max-w-[150px] min-w-[70px] flex items-center min-h-[14px]">
            {isLoading ? <Skeleton className="w-16 h-2.5 rounded-[3px]" /> : (def || '...')}
          </div>
        </div>
      </div>

      {hasChildren && !isUnknown && (
        <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#AFB6BB]">
          <PiCaretRightBold size={20} />
        </div>
      )}
    </Card3D>
  );
}
