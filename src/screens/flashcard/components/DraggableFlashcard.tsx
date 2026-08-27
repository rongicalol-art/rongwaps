import React, { useEffect, useMemo } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { Flashcard } from '../../../data/flashcards';
import { MemoryHookCharacter } from '../../../features/character-memory-hooks';
import type { RankedExample } from '../../../utils/courseExamples';
import { extractWordVariants } from '../../../utils/courseExamples';
import { isHanziChar } from '../../../utils/hanzi';
import { PosBadge } from '../../../lib/widgets';
import { formatPosLabel } from '../../../utils/posLabels';
import { FlashcardExamples } from './FlashcardExamples';

export interface DraggableFlashcardProps {
  card: Flashcard;
  direction: number;
  isFlipped: boolean;
  setActiveBreakdown: (char: string, index?: number) => void;
  triggerSwipeRate: (level: number) => void;
  onCardTap: (e: React.MouseEvent) => void;
  showPinyin?: boolean;
  showTranslation?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
}

// The card keeps one fixed size for both faces (matching the reference app):
// the back is a scroll container, so examples never change the card's layout.
function getCardHeight() {
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight;
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  return Math.round(
    viewportWidth >= 640
      ? Math.min(480, Math.max(420, viewportHeight * 0.53))
      : Math.min(420, Math.max(360, viewportHeight * 0.48)),
  );
}

function getCardWidth() {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  const workspaceNavWidth = typeof document === 'undefined'
    ? (viewportWidth >= 768 ? 288 : 0)
    : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace-nav-width')) || 0;
  const shellPadding = viewportWidth >= 640 ? 48 : 32;
  // The available width follows the shell's responsive padding and persistent
  // side rail instead of overflowing the workspace at narrow desktop sizes.
  const availableWidth = viewportWidth - workspaceNavWidth - shellPadding;
  return Math.round(Math.min(viewportWidth >= 640 ? 460 : 320, Math.max(280, availableWidth)));
}

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 64 : -64,
      opacity: 0,
      scale: 0.965,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 96 : -96,
      opacity: 0,
      scale: 0.975,
    };
  }
};

export const DraggableFlashcard = ({
  card, direction, isFlipped,
  setActiveBreakdown, triggerSwipeRate, onCardTap,
  showPinyin = true, showTranslation = true,
  examples = [], isExamplesLoading = false,
}: DraggableFlashcardProps) => {
  const isDraggingRef = React.useRef(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [cardHeight, setCardHeight] = React.useState(getCardHeight);
  const [cardWidth, setCardWidth] = React.useState(getCardWidth);
  const backScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollInteractionRef = React.useRef(false);
  const lastScrollInteractionAtRef = React.useRef(0);
  const reduceMotion = useReducedMotion();
  const hasExampleContent = isExamplesLoading || examples.length > 0;
  const hasDefinition = Boolean(card.back?.trim());

  // Every search form for this card — raw traditional + simplified (with /
  // alternatives and （） optionals) plus the display front — drives both the
  // example matching and the sentence highlighting.
  const searchTerms = useMemo(
    () => extractWordVariants(card.front, card.traditional, card.simplified),
    [card.front, card.traditional, card.simplified],
  );

  useEffect(() => {
    const handleResize = () => {
      setCardHeight(getCardHeight());
      setCardWidth(getCardWidth());
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isFlipped) return;
    // Always land on the answer; the examples are a scroll away, not a state.
    if (backScrollRef.current) backScrollRef.current.scrollTop = 0;
  }, [isFlipped]);

  const markScrollInteraction = React.useCallback(() => {
    scrollInteractionRef.current = true;
    lastScrollInteractionAtRef.current = Date.now();
  }, []);

  // Pure scroll: the card keeps its size and the content glides inside it.
  const handleBackScroll = () => {
    markScrollInteraction();
  };

  // Flip: the card rotates with perspective while the faces crossfade around
  // the 90° midpoint — instead of relying on `preserve-3d` + backface
  // culling. Transformed descendants inside the faces (e.g. the magnetic
  // character glyphs) break backface culling in some browsers and show
  // mirrored characters mid-flip; the opacity crossfade makes the flip
  // immune to that, in every browser.
  const flipAngle = useMotionValue(0);
  const frontOpacity = useTransform(flipAngle, [0, 80, 100, 180], [1, 1, 0, 0]);
  const backOpacity = useTransform(flipAngle, [0, 80, 100, 180], [0, 0, 1, 1]);
  // A face that has fully faded out must not intercept pointer events, stay
  // focusable, or paint — opacity (unlike backface culling) leaves the
  // element hit-testable and in the tab order.
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
    if (len === 1) return 'text-[100px] sm:text-[130px] md:text-[150px]';
    if (len === 2) return 'text-[80px] sm:text-[100px] md:text-[120px]';
    if (len === 3) return 'text-[60px] sm:text-[76px] md:text-[90px]';
    if (len === 4) return 'text-[46px] sm:text-[60px] md:text-[72px]';
    if (len <= 6) return 'text-[36px] sm:text-[48px] md:text-[56px]';
    return 'text-[28px] sm:text-[36px] md:text-[42px]';
  };

  const getBackFrontFontSize = (len: number) => {
    if (len <= 2) return 'text-[48px] sm:text-[60px]';
    if (len === 3) return 'text-[40px] sm:text-[50px]';
    if (len === 4) return 'text-[32px] sm:text-[40px]';
    if (len <= 6) return 'text-[26px] sm:text-[32px]';
    return 'text-[20px] sm:text-[24px]';
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate={{
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
      }}
      exit="exit"
      transition={{
        x: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.82 },
        opacity: { duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' },
        scale: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.76 },
      }}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragStart={() => {
        isDraggingRef.current = true;
        setIsDragging(true);
      }}
      onDragEnd={(e, info) => {
        // Small delay to allow click handler to detect drag vs tap
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 50);

        if (info.offset.x < -80) {
          triggerSwipeRate(1);
        } else if (info.offset.x > 80) {
          triggerSwipeRate(3);
        }
      }}
      onClick={(e: React.MouseEvent) => {
        if (isDraggingRef.current) return;
        if (scrollInteractionRef.current && Date.now() - lastScrollInteractionAtRef.current < 500) {
          scrollInteractionRef.current = false;
          return;
        }
        scrollInteractionRef.current = false;
        if ((e.target as HTMLElement).closest('button')) return;
        onCardTap(e);
      }}
      style={{
        width: cardWidth,
        touchAction: isFlipped ? 'pan-y' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="absolute inset-x-0 mx-auto"
    >
      <motion.div
        style={{ rotateY: flipAngle, height: cardHeight }}
        className="relative w-full cursor-pointer overflow-hidden"
      >
        {/* Front Side */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[32px] border-b-4 border-ui-border bg-white p-8"
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
                    if (isDraggingRef.current) return;
                    setActiveBreakdown(card.front, hanziIndex);
                  }}
                  glyphClassName={`${getFrontFontSize(frontLength)} block leading-[1.1] text-ui-ink tracking-normal text-center`}
                  className="flex flex-col items-center justify-center rounded-[24px] px-1 sm:px-2 py-4 sm:py-6"
                />
              );
            })}
          </div>
        </motion.div>

        {/* Back Side — pre-rotated 180° so it reads normally once the card
            has flipped; the midpoint crossfade swaps which face is visible. */}
        <motion.div
          className="absolute inset-0 flex flex-col rounded-[32px] border-b-4 border-ui-border bg-white p-6 pb-10 sm:p-8 sm:pb-10"
          style={{ opacity: backOpacity, rotateY: 180, visibility: backVisibility }}
        >
          <div
            ref={backScrollRef}
            tabIndex={0}
            aria-label="Flashcard answer and example sentences"
            onScroll={handleBackScroll}
            className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain pt-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 sm:pt-3"
          >
            <div className="flex min-h-full w-full shrink-0 flex-col items-center justify-center rounded-[24px] bg-transparent px-8 py-3">
              <div className="flex flex-row items-center justify-center flex-wrap mb-3">
                {Array.from(card.front).map((char, i) => {
                  const isHanzi = isHanziChar(char);
                  const hanziIndex = Array.from(card.front).slice(0, i).filter(isHanziChar).length;

                  if (!isHanzi) {
                    return (
                      <span key={i} className={`${getBackFrontFontSize(frontLength)} px-1 text-ui-muted leading-none font-chinese text-center mt-2`}>
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
                        if (isDraggingRef.current) return;
                        setActiveBreakdown(card.front, hanziIndex);
                      }}
                      glyphClassName={`${getBackFrontFontSize(frontLength)} block leading-none text-ui-ink tracking-normal text-center`}
                      className="rounded-[16px] px-1 py-1"
                    />
                  );
                })}
              </div>
              {showPinyin && (
                <span className="mt-2 text-[18px] font-bold tracking-wide text-ui-ink sm:text-[20px]">
                  {numberToToneMarks(card.pinyin ?? '')}
                </span>
              )}
              {formatPosLabel(card.pos) && (
                <div className="mt-3 flex justify-center">
                  <PosBadge pos={card.pos} />
                </div>
              )}
              {hasDefinition && (
                <h2 className={`${
                  card.back?.length > 40 ? 'text-[16px] sm:text-[18px] md:text-[20px]' :
                  card.back?.length > 20 ? 'text-[18px] sm:text-[22px] md:text-[24px]' :
                  'text-[22px] sm:text-[26px] md:text-[30px]'
                } mt-2 w-full shrink-0 break-words px-2 text-center font-extrabold leading-tight text-ui-ink`}>
                  {card.back}
                </h2>
              )}
            </div>
            {hasExampleContent && (
              <FlashcardExamples
                searchTerms={searchTerms}
                examples={examples}
                isLoading={isExamplesLoading}
                showPinyin={showPinyin}
                showTranslation={showTranslation}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
