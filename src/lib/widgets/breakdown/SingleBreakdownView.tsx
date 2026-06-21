import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PiLightbulbFill } from 'react-icons/pi';
import { ScreenHeader } from "../ScreenHeader";
import { BreakdownWordInfo } from "../BreakdownWordInfo";
import { DeepBreakdownModal } from "../DeepBreakdownModal";
import { UsedAsListModal } from "../UsedAsListModal";
import { RelatedWordsListModal } from "../RelatedWordsListModal";
import { BottomDrawer } from "../BottomDrawer";
import { AiMnemonicCard } from "./AiMnemonicCard";
import { BreakdownSkeleton } from "../BreakdownSkeleton";
import { BottomCharacterTabs } from "./BottomCharacterTabs";
import { useSingleBreakdown } from "./hooks/useSingleBreakdown";
import { useCompactHeaderOnScroll } from "../../../hooks/useCompactHeaderOnScroll";
import { useAppStore } from "../../../store/useAppStore";

interface SingleBreakdownViewProps {
  word: string;
  initialCharIndex: number;
  onBack?: () => void;
  onClose?: () => void;
  activeBook: any;
  pushBreakdown: (word: string) => void;
  depth: number;
}

export const SingleBreakdownView: React.FC<SingleBreakdownViewProps> = ({
  word,
  initialCharIndex,
  onBack,
  onClose,
  activeBook,
  pushBreakdown,
  depth,
}) => {
  const [showDeepBreakdown, setShowDeepBreakdown] = useState(false);
  const [showUsedAsBreakdown, setShowUsedAsBreakdown] = useState(false);
  const [showAiMnemonic, setShowAiMnemonic] = useState(false);
  const [showRelatedBreakdown, setShowRelatedBreakdown] = useState(false);
  
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

  const {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    breakdownCharIndex,
    setBreakdownCharIndex,
    chars
  } = useSingleBreakdown(word, initialCharIndex, activeBook);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      style={{ zIndex: 300 + depth }}
      className="absolute inset-0 w-full h-full bg-[#F7F7F7] flex flex-col pointer-events-auto font-sans shadow-2xl"
    >
      <ScreenHeader 
        onBack={onBack}
        onClose={onClose}
        title="CHARACTER BREAKDOWN"
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

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        onScroll={handleHeaderScroll}
        style={{ backgroundColor: activeBook.neutralBg || "#F7F7F7" }}
      >
        <div className="max-w-[768px] mx-auto w-full px-4 py-6 sm:py-8 flex flex-col gap-6 pb-12 relative min-h-full">
          <AnimatePresence mode="wait">
            {!charData ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <BreakdownSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <BreakdownWordInfo
                  activeChar={activeChar}
                  charData={charData}
                  charCardsInfo={charCardsInfo}
                  activeBook={activeBook}
                  components={components}
                  usedAsComponents={usedAsComponents}
                  relatedWords={relatedWords}
                  setDictionaryWord={pushBreakdown}
                  chars={chars}
                  setBreakdownCharIndex={setBreakdownCharIndex}
                  openDeepBreakdown={() => setShowDeepBreakdown(true)}
                  openUsedAsBreakdown={() => setShowUsedAsBreakdown(true)}
                  openRelatedBreakdown={() => setShowRelatedBreakdown(true)}
                  isUsedAsLoading={isUsedAsLoading}
                  isRelatedLoading={isRelatedLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {chars.length > 1 && <div className="h-28 shrink-0 pointer-events-none" />}
        </div>
      </div>

      {/* Bottom Fade Gradient Overlay */}
      {chars.length > 1 && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{
            background: `linear-gradient(to top, ${activeBook.neutralBg || '#F7F7F7'} 0%, ${activeBook.neutralBg || '#F7F7F7'}d0 50%, transparent 100%)`
          }}
        />
      )}

      {/* Bottom Tabs for Characters */}
      <BottomCharacterTabs
        chars={chars}
        selectedIndex={breakdownCharIndex}
        onChange={setBreakdownCharIndex}
        activeBook={activeBook}
        layoutIdPrefix={`breakdown-${depth}-${word}`}
      />

      {/* Deep Breakdown Modal */}
      <AnimatePresence>
        {showDeepBreakdown && (
          <DeepBreakdownModal
            initialChar={activeChar}
            onClose={() => setShowDeepBreakdown(false)}
            activeBook={activeBook}
            onWordClick={(w) => {
              pushBreakdown(w);
              setShowDeepBreakdown(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUsedAsBreakdown && (
          <UsedAsListModal
            initialChar={activeChar}
            usedAsComponents={usedAsComponents}
            activeBook={activeBook}
            onClose={() => setShowUsedAsBreakdown(false)}
            onWordClick={(w) => {
              pushBreakdown(w);
              setShowUsedAsBreakdown(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRelatedBreakdown && (
          <RelatedWordsListModal
            initialChar={activeChar}
            relatedWords={relatedWords}
            activeBook={activeBook}
            onClose={() => setShowRelatedBreakdown(false)}
            onWordClick={(w) => {
              useAppStore.getState().setDictionaryWord(w);
              setShowRelatedBreakdown(false);
            }}
          />
        )}
      </AnimatePresence>

      <BottomDrawer isOpen={showAiMnemonic} onClose={() => setShowAiMnemonic(false)}>
        <div className="pt-2 pb-6 px-4">
          <AiMnemonicCard 
            char={activeChar} 
            data={charData} 
            accentBgClass={activeBook.accentBg} 
            accentTextClass={activeBook.accent} 
            buttonEdgeClass={activeBook.buttonEdge} 
          />
        </div>
      </BottomDrawer>
    </motion.div>
  );
};
