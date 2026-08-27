import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ScreenHeader } from "../../../../lib/widgets";
import { BreakdownWordInfo } from "../BreakdownWordInfo";
import { DeepBreakdownModal } from "../DeepBreakdownModal";
import { UsedAsListModal } from "../UsedAsListModal";
import { RelatedWordsListModal } from "../RelatedWordsListModal";
import { BreakdownSkeleton } from "../BreakdownSkeleton";
import { BottomCharacterTabs } from "./BottomCharacterTabs";
import { useSingleBreakdown } from "../../hooks/useSingleBreakdown";
import { useAppStore } from "../../../../store/useAppStore";
import { SAMPLE_BOOKS } from '../../../../data/books';
import { useModalFocus } from "../../../../hooks/useModalFocus";
import { getDecompositionRuntimeService } from '../../../character-decomposition/decompositionService';
import { V3CharacterBreakdown } from '../v3/V3CharacterBreakdown';
import { V3TreeScreen } from '../v3/V3TreeScreen';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface SingleBreakdownViewProps {
  word: string;
  initialCharIndex: number;
  workspaceOffset?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  activeBook: CourseBook;
  pushBreakdown: (word: string) => void;
  depth: number;
}

export const SingleBreakdownView: React.FC<SingleBreakdownViewProps> = ({
  word,
  initialCharIndex,
  workspaceOffset = true,
  onBack,
  onClose,
  activeBook,
  pushBreakdown,
  depth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [showDeepBreakdown, setShowDeepBreakdown] = useState(false);
  const [showUsedAsBreakdown, setShowUsedAsBreakdown] = useState(false);
  const [showRelatedBreakdown, setShowRelatedBreakdown] = useState(false);
  const [showV3Tree, setShowV3Tree] = useState(false);
  const [showCharacterTabs, setShowCharacterTabs] = useState(false);
  
  const {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    usedAsGroups,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    breakdownCharIndex,
    setBreakdownCharIndex,
    chars
  } = useSingleBreakdown(word, initialCharIndex, activeBook);
  const decompositionRuntime = getDecompositionRuntimeService();
  const isV3Runtime = decompositionRuntime.runtime === 'v3';
  const modalFocusProps = useModalFocus({
    containerRef,
    isActive: true,
    onEscape: onBack ?? onClose,
  });

  const updateCharacterTabsVisibility = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    setShowCharacterTabs(remaining <= 56);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateCharacterTabsVisibility);
    return () => window.cancelAnimationFrame(frame);
  }, [activeChar, charData, relatedWords.length, usedAsComponents.length, updateCharacterTabsVisibility]);

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
      className={`absolute inset-0 flex h-full flex-col bg-ui-practice-canvas font-sans pointer-events-auto ${workspaceOffset ? 'workspace-window w-auto' : 'w-full'}`}
    >
      <ScreenHeader 
        onBack={onBack}
        onClose={onClose}
        centerContent={<h1 className="w-full text-center text-sm font-black text-ui-ink-strong sm:text-base">Character breakdown</h1>}
        maxWidth="none"
        className="sticky top-0 z-40 w-full max-w-full shrink-0 border-0 bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent px-4 shadow-none backdrop-blur-[2px] sm:px-6 lg:px-10"
      />

      {/* Main Content Area */}
      <div
        ref={scrollRef}
        onScroll={updateCharacterTabsVisibility}
        className="custom-scrollbar relative z-10 flex-1 overflow-y-auto bg-transparent"
      >
        <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-6 px-4 py-4 pb-12 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <AnimatePresence mode="wait">
            {!charData && !isV3Runtime ? (
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
                {isV3Runtime ? (
                  <V3CharacterBreakdown
                    activeChar={activeChar}
                    charData={charData}
                    charCardsInfo={charCardsInfo}
                    activeBook={activeBook}
                    usedAsComponents={usedAsComponents}
                    usedAsGroups={usedAsGroups}
                    relatedWords={relatedWords}
                    setDictionaryWord={pushBreakdown}
                    openTree={() => setShowV3Tree(true)}
                    openUsedAsBreakdown={() => setShowUsedAsBreakdown(true)}
                    openRelatedBreakdown={() => setShowRelatedBreakdown(true)}
                  />
                ) : (
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
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {chars.length > 1 && <div className="h-28 shrink-0 pointer-events-none" />}
        </div>
      </div>

      {/* Bottom Fade Gradient Overlay */}
      {chars.length > 1 && showCharacterTabs && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, var(--color-ui-practice-canvas) 0%, color-mix(in srgb, var(--color-ui-practice-canvas) 82%, transparent) 50%, transparent 100%)'
          }}
        />
      )}

      {/* Bottom Tabs for Characters */}
      <AnimatePresence>
        {showCharacterTabs && (
          <BottomCharacterTabs
            chars={chars}
            selectedIndex={breakdownCharIndex}
            onChange={setBreakdownCharIndex}
            activeBook={activeBook}
            layoutIdPrefix={`breakdown-${depth}-${word}`}
          />
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {isV3Runtime && showV3Tree && (
          <V3TreeScreen
            character={activeChar}
            data={charData}
            onBack={() => setShowV3Tree(false)}
            onGlyphClick={(target) => {
              setShowV3Tree(false);
              pushBreakdown(target);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
