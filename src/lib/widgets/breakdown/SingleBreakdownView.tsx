import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ScreenHeader } from "../ScreenHeader";
import { AppIcon } from "../AppIcon";
import { IconActionButton } from "../IconActionButton";
import { BreakdownWordInfo } from "../BreakdownWordInfo";
import { DeepBreakdownModal } from "../DeepBreakdownModal";
import { UsedAsListModal } from "../UsedAsListModal";
import { RelatedWordsListModal } from "../RelatedWordsListModal";
import { BottomDrawer } from "../BottomDrawer";
import { AiMnemonicCard } from "./AiMnemonicCard";
import { BreakdownSkeleton } from "../BreakdownSkeleton";
import { BottomCharacterTabs } from "./BottomCharacterTabs";
import { useSingleBreakdown } from "./hooks/useSingleBreakdown";
import { useAppStore } from "../../../store/useAppStore";
import { SAMPLE_BOOKS } from '../../../data/books';
import { useModalFocus } from "../../../hooks/useModalFocus";

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface SingleBreakdownViewProps {
  word: string;
  initialCharIndex: number;
  onBack?: () => void;
  onClose?: () => void;
  activeBook: CourseBook;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [showDeepBreakdown, setShowDeepBreakdown] = useState(false);
  const [showUsedAsBreakdown, setShowUsedAsBreakdown] = useState(false);
  const [showAiMnemonic, setShowAiMnemonic] = useState(false);
  const [showRelatedBreakdown, setShowRelatedBreakdown] = useState(false);
  
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
  const modalFocusProps = useModalFocus({
    containerRef,
    isActive: true,
    onEscape: onBack ?? onClose,
  });

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Character breakdown for ${word}`}
      tabIndex={-1}
      onKeyDown={modalFocusProps.onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
      style={{ zIndex: 300 + depth }}
      className="absolute inset-0 flex h-full w-full flex-col bg-ui-practice-canvas font-sans pointer-events-auto"
    >
      <ScreenHeader 
        onBack={onBack}
        onClose={onClose}
        title="CHARACTER BREAKDOWN"
        rightAction={
          <IconActionButton
            onClick={() => setShowAiMnemonic(true)}
            className="relative z-30 -mr-1 text-amber-500 hover:text-amber-600"
            label="Show memory hook"
            icon={<AppIcon name="lightbulb" size={24} />}
            size="lg"
          />
        }
        maxWidth="none"
        className="z-20 w-full max-w-full shrink-0 border-b-0 bg-transparent px-4 shadow-none sm:px-6 lg:px-10"
      />

      {/* Main Content Area */}
      <div
        className="custom-scrollbar relative z-10 flex-1 overflow-y-auto bg-transparent"
      >
        <div className="relative mx-auto flex min-h-full w-full max-w-[1100px] flex-col gap-6 px-4 py-5 pb-12 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
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
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
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
            background: 'linear-gradient(to top, var(--color-ui-practice-canvas) 0%, color-mix(in srgb, var(--color-ui-practice-canvas) 82%, transparent) 50%, transparent 100%)'
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
