import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { DetailShell, ScreenHeader } from "../../../../lib/widgets";
import { BreakdownWordInfo } from "../BreakdownWordInfo";
import { BreakdownSettingsPopover } from "../BreakdownSettingsPopover";
import { DeepBreakdownModal } from "../DeepBreakdownModal";
import { UsedAsListModal } from "../UsedAsListModal";
import { RelatedWordsListModal } from "../RelatedWordsListModal";
import { BreakdownSkeleton } from "../BreakdownSkeleton";
import { useSingleBreakdown } from "../../hooks/useSingleBreakdown";
import { useSoundClue } from '../../hooks/useSoundClue';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { getDecompositionRuntimeService } from '../../../character-decomposition';
import { V3CharacterBreakdown } from '../v3/V3CharacterBreakdown';
import { V3TreeScreen } from '../v3/V3TreeScreen';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [showDeepBreakdown, setShowDeepBreakdown] = useState(false);
  const [showUsedAsBreakdown, setShowUsedAsBreakdown] = useState(false);
  const [showRelatedBreakdown, setShowRelatedBreakdown] = useState(false);
  const [showV3Tree, setShowV3Tree] = useState(false);
  
  const {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    builtWithMembers,
    soundFamily,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    setBreakdownCharIndex,
    chars,
  } = useSingleBreakdown(word, initialCharIndex, activeBook);
  const soundClue = useSoundClue(activeChar, charData?.pinyin?.[0]);
  const decompositionRuntime = getDecompositionRuntimeService();
  const isV3Runtime = decompositionRuntime.runtime === 'v3';

  return (
    <DetailShell.Root
      ariaLabel={`Character breakdown for ${word}`}
      tone="practice"
      style={{ zIndex: 300 + depth }}
      onEscape={onBack ?? onClose}
    >
      <DetailShell.Scroller ref={scrollRef}>
        <ScreenHeader
          variant="panel"
          tone="practice"
          onClose={onClose}
          onBack={onBack}
          maxWidth="none"
          centerContent={
            <h1 className="w-full text-center text-xs sm:text-sm font-black uppercase tracking-wider text-ui-ink-strong">
              Character breakdown
            </h1>
          }
          rightAction={<BreakdownSettingsPopover />}
        />
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
                    builtWithMembers={builtWithMembers}
                    soundFamily={soundFamily}
                    relatedWords={relatedWords}
                    soundClue={soundClue}
                    setDictionaryWord={pushBreakdown}
                    openTree={() => setShowV3Tree(true)}
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
        </div>
      </DetailShell.Scroller>

      <DetailShell.Floating>

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

        {/* Used As List Modal */}
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

        {/* Related Words List Modal */}
        <AnimatePresence>
          {showRelatedBreakdown && (
            <RelatedWordsListModal
              initialChar={activeChar}
              relatedWords={relatedWords}
              activeBook={activeBook}
              onClose={() => setShowRelatedBreakdown(false)}
              onWordClick={(w) => {
                pushBreakdown(w);
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
              soundClue={soundClue}
              accentHex={activeBook.accentHex}
              edgeHex={activeBook.edgeHex}
              onBack={() => setShowV3Tree(false)}
              onGlyphClick={(target) => {
                setShowV3Tree(false);
                pushBreakdown(target);
              }}
            />
          )}
        </AnimatePresence>
      </DetailShell.Floating>
    </DetailShell.Root>
  );
};
