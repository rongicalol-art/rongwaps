import React, { useEffect, useState, useRef } from 'react';
import {
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import {
  MemoryHookCharacter,
  shouldShowWordHook,
  useMemoryHook,
  wordMnemonicKey,
} from '../../../features/character-memory-hooks';
import { AppIcon } from '../../../lib/widgets';
import type { RankedExample } from '../../../utils/courseExamples';
import { cn } from '../../../utils/cn';
import { isHanziChar } from '../../../utils/hanzi';
import { FlashcardBackFace } from '../../../features/flashcards';

export interface DraggableFlashcardProps {
  card: Flashcard;
  direction: number;
  isFlipped: boolean;
  setActiveBreakdown: (char: string, index?: number) => void;
  triggerSwipeRate: (level: number, animDir?: number) => boolean | void;
  onCardTap: () => void;
  showPinyin?: boolean;
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
  if (len === 1) return 'text-[100px] sm:text-[130px] md:text-[150px] lg:text-[175px]';
  if (len === 2) return 'text-[80px] sm:text-[100px] md:text-[120px] lg:text-[138px]';
  if (len === 3) return 'text-[60px] sm:text-[76px] md:text-[90px] lg:text-[104px]';
  if (len === 4) return 'text-[46px] sm:text-[60px] md:text-[72px] lg:text-[84px]';
  if (len <= 6) return 'text-[36px] sm:text-[48px] md:text-[56px] lg:text-[64px]';
  return 'text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px]';
}

export const DraggableFlashcard = React.memo(function DraggableFlashcard({
  card,
  direction,
  isFlipped,
  setActiveBreakdown,
  triggerSwipeRate,
  onCardTap,
  showPinyin = true,
  showTranslation = true,
  examples,
  isExamplesLoading,
}: DraggableFlashcardProps) {
  const isPresent = useIsPresent();
  const [isDragging, setIsDragging] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const isDraggingRef = useRef(false);
  const wasSwipedRef = useRef(false);
  const backScrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const isInteractive = isPresent && !isSwiped;

  const showWordHookChip = shouldShowWordHook(card.front);
  const { hook: wordHook, loaded: wordHookLoaded } = useMemoryHook(
    wordMnemonicKey(card.front),
    Boolean(showWordHookChip && isFlipped),
  );
  const [showHook, setShowHook] = useState(false);

  useEffect(() => {
    setShowHook(false);
  }, [isFlipped, card.front]);

  const renderWordHookButton = () => {
    if (!showWordHookChip || !wordHookLoaded || !wordHook) return null;

    return (
      <button
        type="button"
        aria-label={showHook ? `Hide memory hook for ${card.front}` : `Open memory hook for ${card.front}`}
        aria-expanded={showHook}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (isDragging) return;
          setShowHook((prev) => {
            if (backScrollRef.current) backScrollRef.current.scrollTop = 0;
            return !prev;
          });
        }}
        className={cn(
          'absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full focus-ring active:scale-95',
          showHook
            ? 'bg-feedback-warning text-ui-ink-strong shadow-ambient-sm'
            : 'text-ui-muted hover:bg-ui-hover hover:text-feedback-warning-edge active:bg-ui-divider',
        )}
      >
        <AppIcon name="hint" size={17} />
      </button>
    );
  };

  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-240, 0, 240], [-12, 0, 12]);
  const greenBorderOpacity = useTransform(dragX, [0, 80], [0, 0.35]);
  const redBorderOpacity = useTransform(dragX, [-80, 0], [0.35, 0]);

  useEffect(() => {
    if (!isFlipped && backScrollRef.current) {
      backScrollRef.current.scrollTop = 0;
    }
  }, [isFlipped]);

  const flipAngle = useMotionValue(0);
  const frontOpacity = useTransform(flipAngle, [0, 80, 100, 180], [1, 1, 0, 0]);
  const backOpacity = useTransform(flipAngle, [0, 80, 100, 180], [0, 0, 1, 1]);
  const frontVisibility = useTransform(frontOpacity, (v) => (v > 0 ? 'visible' : 'hidden'));
  const backVisibility = useTransform(backOpacity, (v) => (v > 0 ? 'visible' : 'hidden'));

  useEffect(() => {
    const controls = animate(flipAngle, isFlipped ? 180 : 0, {
      duration: reduceMotion ? 0 : 0.42,
      ease: [0.32, 0.72, 0, 1],
    });
    return () => controls.stop();
  }, [flipAngle, isFlipped, reduceMotion]);

  const frontLength = card?.front?.length || 1;

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isInteractive || isDraggingRef.current || wasSwipedRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;
    onCardTap();
  };

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
        "absolute inset-x-0 mx-auto flex items-center justify-center transform-gpu will-change-transform w-[min(340px,calc(100vw-32px))] sm:w-[min(480px,calc(100vw-var(--workspace-nav-width,0px)-48px))] md:w-[min(540px,calc(100vw-var(--workspace-nav-width,0px)-48px))] lg:w-[min(620px,calc(100vw-var(--workspace-nav-width,0px)-64px))] max-w-[620px] h-[clamp(360px,48vh,420px)] sm:h-[clamp(420px,53vh,480px)] md:h-[clamp(450px,55vh,520px)] lg:h-[clamp(480px,58vh,560px)] select-none",
        isInteractive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{
        zIndex: isPresent ? 10 : 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <motion.div
        drag={isInteractive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
        onDragStart={() => {
          if (!isInteractive) return;
          isDraggingRef.current = true;
          setIsDragging(true);
        }}
        onDragEnd={(_e, info) => {
          setTimeout(() => {
            isDraggingRef.current = false;
            setIsDragging(false);
          }, 60);
          if (!isInteractive) return;

          const { offset, velocity } = info;
          const isFlick = Math.abs(offset.x) >= 40 && Math.abs(velocity.x) > 300;

          if (offset.x < -80 || (offset.x < -40 && isFlick)) {
            const accepted = triggerSwipeRate(1, 1);
            if (accepted !== false) {
              wasSwipedRef.current = true;
              setIsSwiped(true);
              animate(dragX, -220, { duration: 0.2, ease: 'easeOut' });
            }
          } else if (offset.x > 80 || (offset.x > 40 && isFlick)) {
            const accepted = triggerSwipeRate(3, -1);
            if (accepted !== false) {
              wasSwipedRef.current = true;
              setIsSwiped(true);
              animate(dragX, 220, { duration: 0.2, ease: 'easeOut' });
            }
          }
        }}
        onClick={handleCardClick}
        style={{
          x: dragX,
          rotate,
          touchAction: isFlipped ? 'pan-y' : 'none',
        }}
        className="relative w-full h-full cursor-pointer transform-gpu [perspective:2000px]"
      >
        <motion.div
          style={{ rotateY: flipAngle }}
          className="relative w-full h-full [transform-style:preserve-3d]"
        >
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-8 shadow-ambient-sm [backface-visibility:hidden]"
            style={{ opacity: frontOpacity, visibility: frontVisibility }}
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
          </motion.div>

          <motion.div
            className={cn(
              'absolute inset-0 flex flex-col rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface overflow-hidden shadow-ambient-sm [backface-visibility:hidden]',
              showHook ? 'p-4 pb-4 sm:p-6 sm:pb-5' : 'p-6 pb-10 sm:p-8 sm:pb-10',
            )}
            style={{ opacity: backOpacity, rotateY: 180, visibility: backVisibility }}
          >
            {renderWordHookButton()}
            <FlashcardBackFace
              card={card}
              isFlipped={isFlipped}
              setActiveBreakdown={setActiveBreakdown}
              showPinyin={showPinyin}
              showTranslation={showTranslation}
              examples={examples}
              isExamplesLoading={isExamplesLoading}
              isDragging={isDragging}
              scrollRef={backScrollRef}
              showHook={showHook}
              hook={wordHook}
              hookLoaded={wordHookLoaded}
            />
          </motion.div>
        </motion.div>

        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-success" style={{ opacity: greenBorderOpacity }} />
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-danger" style={{ opacity: redBorderOpacity }} />
      </motion.div>
    </motion.div>
  );
});
