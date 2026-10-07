import React, { useEffect, useState, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import {
  MemoryHookCharacter,
  shouldShowWordHook,
} from '../../../features/character-memory-hooks';
import { AppIcon } from '../../../lib/widgets';
import type { RankedExample } from '../../../utils/vocabulary/courseExamples';
import { cn } from '../../../utils/cn';
import { isHanziChar } from '../../../utils/characters/hanzi';
import { FlashcardBackFace, useFlashcardExtras } from '../../../features/flashcards';
import { FavoriteButton } from '../../../features/library';
import { useCardSwipe } from '../hooks/useCardSwipe';

export interface DraggableFlashcardProps {
  card: Flashcard;
  direction: number;
  isFlipped: boolean;
  setActiveBreakdown: (char: string, index?: number) => void;
  triggerSwipeRate: (level: number, animDir?: number) => boolean | void;
  onCardTap: () => void;
  showPinyin?: boolean;
  toneColors?: boolean;
  showTranslation?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
}

// direction: 1 = exit left, -1 = exit right
const variants = {
  enter: (direction: number) => ({
    zIndex: 10,
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.965,
    pointerEvents: 'auto' as const,
  }),
  center: {
    zIndex: 10,
    x: 0,
    opacity: 1,
    scale: 1,
    pointerEvents: 'auto' as const,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.975,
    pointerEvents: 'none' as const,
  }),
};

function getFrontFontSize(len: number) {
  // Sized from the card's own width (container query units), not breakpoints.
  if (len === 1) return 'text-[length:clamp(88px,29cqw,220px)]';
  if (len === 2) return 'text-[length:clamp(70px,23cqw,170px)]';
  if (len === 3) return 'text-[length:clamp(52px,17cqw,128px)]';
  if (len === 4) return 'text-[length:clamp(40px,14cqw,104px)]';
  if (len <= 6) return 'text-[length:clamp(30px,10.5cqw,80px)]';
  return 'text-[length:clamp(24px,8cqw,60px)]';
}

export const DraggableFlashcard = React.memo(function DraggableFlashcard({
  card,
  direction,
  isFlipped,
  setActiveBreakdown,
  triggerSwipeRate,
  onCardTap,
  showPinyin = true,
  toneColors = false,
  showTranslation = true,
  examples,
  isExamplesLoading,
}: DraggableFlashcardProps) {
  const isPresent = useIsPresent();
  const [isDragging, setIsDragging] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const wasSwipedRef = useRef(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const backScrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const isInteractive = isPresent && !isSwiped;

  const showWordHookChip = shouldShowWordHook(card.front);
  const { extras } = useFlashcardExtras(card);
  const wordHook = extras.wordHook;
  const [showHook, setShowHook] = useState(false);

  useEffect(() => {
    setShowHook(false);
  }, [isFlipped, card.front]);

  const renderCardActions = () => {
    const hasHook = showWordHookChip && Boolean(wordHook);
    return (
      <div
        className="absolute right-4 top-4 z-10 flex items-center gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {hasHook && (
          <button
            type="button"
            aria-label={showHook ? `Hide memory hook for ${card.front}` : `Open memory hook for ${card.front}`}
            aria-expanded={showHook}
            onClick={(event) => {
              event.stopPropagation();
              if (isDragging) return;
              setShowHook((prev) => {
                if (backScrollRef.current) backScrollRef.current.scrollTop = 0;
                return !prev;
              });
            }}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-control focus-ring active:scale-95',
              showHook
                ? 'bg-feedback-warning-surface ring-2 ring-feedback-warning'
                : 'text-ui-muted hover:bg-ui-hover',
            )}
          >
            <AppIcon name="hint" size={22} />
          </button>
        )}
        <FavoriteButton
          word={card.front}
          traditional={card.traditional}
          simplified={card.simplified}
          pinyin={card.pinyin}
          definitions={card.back}
          size="lg"
          variant="ghost"
          className="h-11 w-11"
        />
      </div>
    );
  };

  useEffect(() => {
    if (!isFlipped && backScrollRef.current) {
      backScrollRef.current.scrollTop = 0;
    }
  }, [isFlipped]);

  const frontLength = card?.front?.length || 1;

  const { bind } = useCardSwipe(swipeRef, {
    enabled: isInteractive,
    onDragChange: setIsDragging,
    onTap: (target) => {
      if (!isInteractive || wasSwipedRef.current) return;
      if ((target as HTMLElement | null)?.closest('button')) return;
      onCardTap();
    },
    onSwipe: (dir) => {
      const accepted = dir < 0 ? triggerSwipeRate(1, 1) : triggerSwipeRate(3, -1);
      if (accepted === false) return false;
      wasSwipedRef.current = true;
      setIsSwiped(true);
      return true;
    },
  });

  const flipTransition = reduceMotion ? 'none' : 'transform 110ms ease-in';
  const faceStyle = (visible: boolean) => ({
    transform: visible ? 'scaleX(1)' : 'scaleX(0)',
    transition: flipTransition,
    transitionDelay: visible && !reduceMotion ? '110ms' : '0ms',
  });

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: reduceMotion ? 0 : 0.15, ease: 'easeOut' },
        scale: { duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] },
      }}
      className={cn(
        "absolute inset-x-0 mx-auto flex items-center justify-center transform-gpu will-change-transform w-[min(100cqw,760px,calc(100cqh*1.1))] h-[min(100cqh,calc(100cqw*1.3))] [container-type:size] select-none",
        isInteractive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{
        zIndex: isPresent ? 10 : 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        ref={swipeRef}
        {...bind}
        style={{ touchAction: 'pan-y' }}
        className="relative h-full w-full cursor-pointer transform-gpu"
      >
        <div className="relative h-full w-full">
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-8 shadow-ambient-sm"
            style={faceStyle(!isFlipped)}
          >
            <div className="flex max-w-full flex-row flex-wrap items-center justify-center">
              {Array.from(card.front).map((char, i) => {
                const isHanzi = isHanziChar(char);
                const hanziIndex = Array.from(card.front).slice(0, i).filter(isHanziChar).length;
                if (!isHanzi) {
                  return (
                    <span key={i} className={`${getFrontFontSize(frontLength)} px-1 sm:px-2 py-4 sm:py-6 text-ui-muted leading-[1.1] font-chinese text-center mt-2`}>
                      {char}
                    </span>
                  );
                }
                return (
                  <MemoryHookCharacter
                    key={i}
                    char={char}
                    label={`Open character breakdown for ${char}`}
                    tooltipDisabled={isDragging}
                    onOpen={() => {
                      if (!isDragging) setActiveBreakdown(card.front, hanziIndex);
                    }}
                    glyphClassName={`${getFrontFontSize(frontLength)} block leading-[1.1] text-ui-ink tracking-normal text-center`}
                    className="flex flex-col items-center justify-center rounded-feature px-1 sm:px-2 py-4 sm:py-6"
                  />
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              'absolute inset-0 flex flex-col rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface overflow-hidden shadow-ambient-sm [contain:layout_paint]',
              showHook ? 'p-4 pb-4 sm:p-6 sm:pb-5' : 'p-6 pb-10 sm:p-8 sm:pb-10',
            )}
            style={faceStyle(isFlipped)}
          >
            {renderCardActions()}
            <FlashcardBackFace
              card={card}
              setActiveBreakdown={setActiveBreakdown}
              showPinyin={showPinyin}
              toneColors={toneColors}
              showTranslation={showTranslation}
              examples={examples}
              isExamplesLoading={isExamplesLoading}
              isDragging={isDragging}
              scrollRef={backScrollRef}
              showHook={showHook}
              hook={wordHook}
              hookLoaded
            />
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-success opacity-[var(--rw-swipe-ok,0)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-danger opacity-[var(--rw-swipe-no,0)]" />
      </div>
    </motion.div>
  );
});
