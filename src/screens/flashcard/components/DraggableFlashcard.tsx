import React, { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
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
import { FlashcardBackFace } from './FlashcardBackFace';

export interface DraggableFlashcardProps {
  card: Flashcard;
  direction: number;
  isFlipped: boolean;
  setActiveBreakdown: (char: string, index?: number) => void;
  triggerSwipeRate: (level: number, animDir?: number) => void;
  onCardTap: () => void;
  showPinyin?: boolean;
  showTranslation?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
}

// The card keeps one fixed size for both faces (matching the reference app):
// the back is a scroll container, so examples never change the card's layout.
export function getCardHeight() {
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight;
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  if (viewportWidth >= 1024) {
    return Math.round(Math.min(560, Math.max(480, viewportHeight * 0.58)));
  }
  if (viewportWidth >= 768) {
    return Math.round(Math.min(520, Math.max(450, viewportHeight * 0.55)));
  }
  if (viewportWidth >= 640) {
    return Math.round(Math.min(480, Math.max(420, viewportHeight * 0.53)));
  }
  return Math.round(Math.min(420, Math.max(360, viewportHeight * 0.48)));
}

export function getCardWidth() {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  const workspaceNavWidth = typeof document === 'undefined'
    ? (viewportWidth >= 768 ? 288 : 0)
    : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace-nav-width')) || 0;
  const shellPadding = viewportWidth >= 1024 ? 64 : viewportWidth >= 640 ? 48 : 32;
  // The available width follows the shell's responsive padding and persistent
  // side rail instead of overflowing the workspace at narrow desktop sizes.
  const availableWidth = viewportWidth - workspaceNavWidth - shellPadding;
  const targetMaxWidth = viewportWidth >= 1024 ? 620 : viewportWidth >= 768 ? 540 : viewportWidth >= 640 ? 480 : 340;
  return Math.round(Math.min(targetMaxWidth, Math.max(280, availableWidth)));
}

// direction: 1 = exit left, -1 = exit right, 2 = exit up, -2 = exit down
const variants = {
  enter: (direction: number) => {
    if (direction === 2) return { y: 64, opacity: 0, scale: 0.965 };
    if (direction === -2) return { y: -64, opacity: 0, scale: 0.965 };
    return {
      x: direction > 0 ? 64 : -64,
      opacity: 0,
      scale: 0.965,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => {
    if (direction === 2) return { zIndex: 0, y: -96, opacity: 0, scale: 0.975 };
    if (direction === -2) return { zIndex: 0, y: 96, opacity: 0, scale: 0.975 };
    return {
      zIndex: 0,
      x: direction < 0 ? 96 : -96,
      opacity: 0,
      scale: 0.975,
    };
  }
};

export const DraggableFlashcard = ({
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
}: DraggableFlashcardProps) => {
  const isDraggingRef = React.useRef(false);
  const backScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollInteractionRef = React.useRef(false);
  const lastScrollInteractionAtRef = React.useRef(0);
  const reduceMotion = useReducedMotion();

  // Memory hook: available for words and single characters when a hook exists.
  // The toggle button appears on the back face of the card to switch into the Story Canvas.
  const showWordHookChip = shouldShowWordHook(card.front);
  const { hook: wordHook, loaded: wordHookLoaded } = useMemoryHook(wordMnemonicKey(card.front), showWordHookChip);
  const [showHook, setShowHook] = React.useState(false);

  // Flipping card back to front or switching cards resets the view to standard answer mode
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
          if (isDraggingRef.current) return;
          setShowHook((prev) => {
            const next = !prev;
            if (backScrollRef.current) {
              backScrollRef.current.scrollTop = 0;
            }
            return next;
          });
        }}
        className={cn(
          'absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full focus-ring active:scale-95',
          showHook
            ? 'bg-feedback-warning text-ui-ink-strong shadow-ambient-sm'
            : 'text-ui-muted hover:bg-ui-hover hover:text-feedback-warning-edge active:bg-ui-divider',
        )}
      >
        <AppIcon name="lightbulb" size={17} />
      </button>
    );
  };

  // Gesture drag offsets are kept on an inner layer isolated from the slide animation
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const MAX_TINT_OFFSET = 80;

  // Directional rating borders: Green for right/up (learned), Red for left/down (review)
  // Only driven by active drag offset, never triggered by outer slide transitions
  const greenBorderOpacity = useTransform([dragX, dragY], ([x, y]: [number, number]) => {
    const intensity = Math.max(0, x, -y);
    return Math.min(0.35, (intensity / MAX_TINT_OFFSET) * 0.35);
  });
  const redBorderOpacity = useTransform([dragX, dragY], ([x, y]: [number, number]) => {
    const intensity = Math.max(0, -x, y);
    return Math.min(0.35, (intensity / MAX_TINT_OFFSET) * 0.35);
  });

  useEffect(() => {
    if (!isFlipped && backScrollRef.current) {
      backScrollRef.current.scrollTop = 0;
    }
  }, [isFlipped]);

  const markScrollInteraction = React.useCallback(() => {
    scrollInteractionRef.current = true;
    lastScrollInteractionAtRef.current = Date.now();
  }, []);

  // 3D Flip angle and smooth crossfade
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
  const getFrontFontSize = (len: number) => {
    if (len === 1) return 'text-[100px] sm:text-[130px] md:text-[150px] lg:text-[175px]';
    if (len === 2) return 'text-[80px] sm:text-[100px] md:text-[120px] lg:text-[138px]';
    if (len === 3) return 'text-[60px] sm:text-[76px] md:text-[90px] lg:text-[104px]';
    if (len === 4) return 'text-[46px] sm:text-[60px] md:text-[72px] lg:text-[84px]';
    if (len <= 6) return 'text-[36px] sm:text-[48px] md:text-[56px] lg:text-[64px]';
    return 'text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px]';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    if (scrollInteractionRef.current && Date.now() - lastScrollInteractionAtRef.current < 400) {
      scrollInteractionRef.current = false;
      return;
    }
    scrollInteractionRef.current = false;
    if ((e.target as HTMLElement).closest('button')) return;
    onCardTap();
  };

  return (
    // Outer Container: Manages enter/exit slide transitions without rating border interference
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.82 },
        y: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.82 },
        opacity: { duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' },
        scale: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.76 },
      }}
      className="absolute inset-x-0 mx-auto pointer-events-auto flex items-center justify-center w-[min(340px,calc(100vw-32px))] sm:w-[min(480px,calc(100vw-var(--workspace-nav-width,0px)-48px))] md:w-[min(540px,calc(100vw-var(--workspace-nav-width,0px)-48px))] lg:w-[min(620px,calc(100vw-var(--workspace-nav-width,0px)-64px))] max-w-[620px] h-[clamp(360px,48vh,420px)] sm:h-[clamp(420px,53vh,480px)] md:h-[clamp(450px,55vh,520px)] lg:h-[clamp(480px,58vh,560px)] select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Inner Container: Handles touch/pointer dragging and rating borders */}
      <motion.div
        drag={isFlipped ? 'x' : true}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.5}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={(_e, info) => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 60);

          const { offset } = info;
          const absX = Math.abs(offset.x);
          const absY = Math.abs(offset.y);

          if (absX >= absY) {
            if (offset.x < -80) {
              triggerSwipeRate(1, 1);
            } else if (offset.x > 80) {
              triggerSwipeRate(3, -1);
            }
          } else {
            if (offset.y < -80) {
              triggerSwipeRate(4, 2);
            } else if (offset.y > 80) {
              triggerSwipeRate(2, -2);
            }
          }
        }}
        onClick={handleCardClick}
        style={{
          x: dragX,
          y: dragY,
          touchAction: isFlipped ? 'pan-y' : 'none',
        }}
        className="relative w-full h-full cursor-pointer [perspective:2000px]"
      >
        {/* 3D Rotating Card Container */}
        <motion.div
          style={{ rotateY: flipAngle }}
          className="relative w-full h-full [transform-style:preserve-3d]"
        >
          {/* Front Side */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-8 [backface-visibility:hidden]"
            style={{ opacity: frontOpacity, visibility: frontVisibility }}
          >
            <div className="flex max-w-full flex-row flex-wrap items-center justify-center">
              {Array.from(card.front).map((char, i) => {
                const isHanzi = isHanziChar(char);
                const hanziIndex = Array.from(card.front).slice(0, i).filter(isHanziChar).length;

                if (!isHanzi) {
                  return (
                    <span
                      key={i}
                      className={`${getFrontFontSize(frontLength)} px-1 sm:px-2 py-4 sm:py-6 text-ui-muted leading-[1.1] font-chinese text-center mt-2`}
                    >
                      {char}
                    </span>
                  );
                }

                return (
                  <MemoryHookCharacter
                    key={i}
                    char={char}
                    label={`Open character breakdown for ${char}`}
                    onOpen={() => {
                      if (isDraggingRef.current) return;
                      setActiveBreakdown(card.front, hanziIndex);
                    }}
                    glyphClassName={`${getFrontFontSize(frontLength)} block leading-[1.1] text-ui-ink tracking-normal text-center`}
                    className="flex flex-col items-center justify-center rounded-feature px-1 sm:px-2 py-4 sm:py-6"
                  />
                );
              })}
            </div>
          </motion.div>

          {/* Back Side */}
          <motion.div
            className={cn(
              'absolute inset-0 flex flex-col rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface overflow-hidden [backface-visibility:hidden]',
              showHook ? 'p-4 pb-4 sm:p-6 sm:pb-5' : 'p-6 pb-10 sm:p-8 sm:pb-10',
            )}
            style={{ opacity: backOpacity, rotateY: 180, visibility: backVisibility }}
          >
            {renderWordHookButton()}
            <FlashcardBackFace
              card={card}
              setActiveBreakdown={setActiveBreakdown}
              showPinyin={showPinyin}
              showTranslation={showTranslation}
              examples={examples}
              isExamplesLoading={isExamplesLoading}
              onScroll={markScrollInteraction}
              scrollRef={backScrollRef}
              showHook={showHook}
              hook={wordHook}
              hookLoaded={wordHookLoaded}
            />
          </motion.div>
        </motion.div>

        {/* Directional Rating Borders: Isolated to drag gesture, invisible during slide transitions */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-success"
          style={{ opacity: greenBorderOpacity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-feature border-[6px] border-feedback-danger"
          style={{ opacity: redBorderOpacity }}
        />
      </motion.div>
    </motion.div>
  );
};
