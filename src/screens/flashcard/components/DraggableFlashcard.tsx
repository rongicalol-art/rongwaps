import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { shouldShowWordHook } from '../../../features/character-memory-hooks';
import { AppIcon } from '../../../lib/widgets';
import type { RankedExample } from '../../../utils/vocabulary/courseExamples';
import { cn } from '../../../utils/cn';
import { isHanziChar } from '../../../utils/characters/hanzi';
import { FlashcardBackFace, useFlashcardExtras } from '../../../features/flashcards';
import { FavoriteButton } from '../../../features/library';
import { FlashcardWritingPractice } from './FlashcardWritingPractice';
import { useCardSwipe } from '../hooks/useCardSwipe';
import { CARD_BOX_CLASS, CARD_SURFACE_CLASS, SETTLE_EASE, SETTLE_MS, questionWordPx } from '../flashcardMotion';

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
  simpleDefinitions?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
  showHook?: boolean;
  onToggleHook?: () => void;
}

// direction: 1 = exit left, -1 = exit right. The next card rises into place once this one has left.
const variants = {
  enter: { zIndex: 10, x: 0, y: 14, opacity: 0, scale: 0.965, pointerEvents: 'auto' as const },
  center: { zIndex: 10, x: 0, y: 0, opacity: 1, scale: 1, pointerEvents: 'auto' as const },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 160 : -160,
    rotate: direction < 0 ? 4 : -4,
    opacity: 0,
    pointerEvents: 'none' as const,
  }),
};

/** Centre and font size of the card's word (the `data-fc-word` block), in the surface's own (unscaled) coordinates. */
function measureWord(root: HTMLElement | null, surface: HTMLElement) {
  if (!root) return null;
  const base = surface.getBoundingClientRect();
  const k = base.width / surface.offsetWidth || 1;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let font = 0;
  // Only the word itself: the answer side also holds Chinese example sentences.
  root.querySelector('[data-fc-word]')?.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.childElementCount > 0 || !isHanziChar(el.textContent?.trim() ?? '')) return;
    const r = el.getBoundingClientRect();
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
    font ||= parseFloat(getComputedStyle(el).fontSize);
  });
  return font ? { cx: ((left + right) / 2 - base.left) / k, cy: ((top + bottom) / 2 - base.top) / k, font } : null;
}

/** The card's own border (same widths and radius) tints green or red as it is dragged toward Got it (ok) or Again (no). */
function SwipeVerdict({ side }: { side: 'ok' | 'no' }) {
  const ok = side === 'ok';
  const v = ok ? '--rw-swipe-ok' : '--rw-swipe-no';
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 rounded-feature border-[3px] border-b-[length:var(--depth-xl)]', ok ? 'border-feedback-success' : 'border-feedback-danger')}
      style={{ opacity: `calc(var(${v}, 0) * 2.8)` }}
    />
  );
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
  simpleDefinitions,
  examples,
  isExamplesLoading,
  showHook: controlledShowHook,
  onToggleHook,
}: DraggableFlashcardProps) {
  const isPresent = useIsPresent();
  const [showWriting, setShowWriting] = useState(false);
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
  const [internalShowHook, setInternalShowHook] = useState(false);
  const showHook = controlledShowHook !== undefined ? controlledShowHook : internalShowHook;
  // The hint only belongs to the answer side. Hide it synchronously on the
  // front so the word-pose measurement never uses the compact hint layout.
  const isHookOpen = showHook && isFlipped;

  useEffect(() => {
    if (controlledShowHook === undefined) {
      setInternalShowHook(false);
    }
  }, [isFlipped, card.front, controlledShowHook]);

  useEffect(() => {
    if (showHook && backScrollRef.current) {
      backScrollRef.current.scrollTop = 0;
    }
  }, [showHook]);

  const handleToggleHook = () => {
    if (backScrollRef.current) backScrollRef.current.scrollTop = 0;
    if (onToggleHook) {
      onToggleHook();
    } else {
      setInternalShowHook((prev) => !prev);
    }
  };

  const renderCardActions = () => {
    const hasHook = showWordHookChip && Boolean(wordHook);
    return (
      <div
        className="rw-rise rw-rise-1 absolute right-3 top-3 z-10 flex items-center gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {hasHook && (
          <button
            type="button"
            aria-label={isHookOpen ? `Hide memory hook for ${card.front}` : `Open memory hook for ${card.front}`}
            aria-expanded={isHookOpen}
            onClick={(event) => {
              event.stopPropagation();
              if (isDragging) return;
              handleToggleHook();
            }}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-compact focus-ring hover:bg-ui-hover active:scale-95',
              isHookOpen ? 'text-feedback-warning hover:text-feedback-warning-edge' : 'text-ui-muted',
            )}
          >
            {/* Same outline-to-filled language as the bookmark beside it. */}
            <AppIcon name={isHookOpen ? 'lightbulbFilled' : 'lightbulb'} size={22} />
          </button>
        )}
        {Array.from(card.front).some(isHanziChar) && <button
          type="button"
          aria-label={`Write ${card.front}`}
          onClick={(event) => {
            event.stopPropagation();
            if (!isDragging) setShowWriting(true);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-compact text-ui-muted focus-ring hover:bg-ui-hover active:scale-95"
        >
          <AppIcon name="pencilOutline" size={22} />
        </button>}
        <FavoriteButton
          word={card.front}
          traditional={card.traditional}
          simplified={card.simplified}
          pinyin={card.pinyin}
          definitions={card.back}
          size="lg"
          variant="ghost"
          className="h-10 w-10 rounded-compact text-ui-muted hover:bg-ui-hover hover:text-ui-muted active:scale-95"
        />
      </div>
    );
  };

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

  // Settle: the card holds ONE word, the answer's own. Before the flip it is posed big and centred with the
  // rest hidden; flipping animates it to its natural place (and back), so it scrolls with its content.
  const surfaceRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const wordAnimRef = useRef<Animation | null>(null);
  const didMountRef = useRef(false);
  // Reset on unmount so StrictMode's dev-only remount does not play the first-pose settle animation.
  useEffect(() => () => { didMountRef.current = false; }, []);

  /** Rest = the word where the answer lays it out. Pose = where it sits on the question side. */
  const readWordPose = () => {
    const surface = surfaceRef.current;
    const word = backRef.current?.querySelector<HTMLElement>('[data-fc-word]');
    if (!surface || !word) return null;
    wordAnimRef.current?.cancel();
    word.style.transform = 'none';
    const rest = measureWord(backRef.current, surface);
    if (!rest) return null;
    const base = surface.getBoundingClientRect();
    const k = base.width / surface.offsetWidth || 1;
    const box = word.getBoundingClientRect();
    const origin = `${rest.cx - (box.left - base.left) / k}px ${rest.cy - (box.top - base.top) / k}px`;
    const poseX = surface.clientLeft + surface.clientWidth / 2;
    const poseY = surface.clientTop + surface.clientHeight / 2;
    const scale = questionWordPx(Array.from(card.front).length, surface.offsetWidth) / rest.font;
    return { word, origin, pose: `translate(${poseX - rest.cx}px, ${poseY - rest.cy}px) scale(${scale})` };
  };

  useLayoutEffect(() => {
    // Rewind the answer before measuring: a scrolled word would be posed at the wrong spot on the question side.
    if (!isFlipped && backScrollRef.current) backScrollRef.current.scrollTop = 0;
    const layout = readWordPose();
    const mounted = didMountRef.current;
    didMountRef.current = true;
    if (!layout) return undefined;
    const { word, origin, pose } = layout;
    const rest = { transformOrigin: origin, transform: 'none' };
    const away = { transformOrigin: origin, transform: pose };
    const options = { duration: SETTLE_MS, easing: SETTLE_EASE };
    word.style.transformOrigin = origin;
    if (isFlipped) {
      word.style.transform = '';
      if (mounted && !reduceMotion) wordAnimRef.current = word.animate([away, rest], options);
    } else {
      word.style.transform = pose;
      if (mounted && !reduceMotion) wordAnimRef.current = word.animate([rest, away], options);
    }
    return () => wordAnimRef.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on flip or card change only; readWordPose reads refs
  }, [isFlipped, card.front, reduceMotion]);

  // Keep the question pose right when the card is resized.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || typeof ResizeObserver === 'undefined') return undefined;
    // observe() reports once on subscribe: only a real size change may re-pose, and never mid-animation.
    let width = surface.offsetWidth;
    let height = surface.offsetHeight;
    const observer = new ResizeObserver(() => {
      if (surface.offsetWidth === width && surface.offsetHeight === height) return;
      width = surface.offsetWidth;
      height = surface.offsetHeight;
      if (isFlipped || wordAnimRef.current?.playState === 'running') return;
      const layout = readWordPose();
      if (!layout) return;
      layout.word.style.transformOrigin = layout.origin;
      layout.word.style.transform = layout.pose;
    });
    observer.observe(surface);

    // The word's resting place on the answer side moves when that side's content changes (examples, hook and
    // fonts arrive after the first paint, e.g. when a lesson has just opened): re-pose so the question side
    // stays centred, not left where the first measurement put it.
    let frame = 0;
    const repose = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (isFlipped || wordAnimRef.current?.playState === 'running') return;
        const layout = readWordPose();
        if (!layout) return;
        layout.word.style.transformOrigin = layout.origin;
        layout.word.style.transform = layout.pose;
      });
    };
    const back = backRef.current;
    const mutations = back && typeof MutationObserver !== 'undefined' ? new MutationObserver(repose) : null;
    if (back) mutations?.observe(back, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(repose, () => {});
    return () => {
      cancelAnimationFrame(frame);
      mutations?.disconnect();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- observer only needs the flip state
  }, [isFlipped]);

  return (
    <>
    {showWriting && <FlashcardWritingPractice word={card.front} onClose={() => setShowWriting(false)} />}
    <motion.div
      data-fc-card={card.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        y: { duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0.9, 0.3, 1.08] },
        scale: { duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0.9, 0.3, 1.08] },
        x: { duration: reduceMotion ? 0 : 0.14, ease: [0.45, 0, 0.8, 0.55] },
        rotate: { duration: reduceMotion ? 0 : 0.14, ease: [0.45, 0, 0.8, 0.55] },
        opacity: { duration: reduceMotion ? 0 : 0.14, ease: 'easeOut' },
      }}
      className={cn(
        CARD_BOX_CLASS, "flex items-center justify-center transform-gpu [container-type:size] select-none",
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
        className="relative h-full w-full cursor-pointer transform-gpu origin-[50%_115%]"
      >
        <div ref={surfaceRef} data-fc-surface className={cn(CARD_SURFACE_CLASS, 'relative h-full w-full overflow-hidden')}>
          <div
            ref={backRef}
            data-reveal={isFlipped}
            className={cn(
              'absolute inset-0 flex flex-col',
              isHookOpen ? 'p-4 pb-4 sm:p-6 sm:pb-5' : 'p-6 pb-5 sm:p-8 sm:pb-6',
              isFlipped ? 'pointer-events-auto' : 'pointer-events-none [&_[data-fc-word]]:pointer-events-auto',
            )}
          >
            {renderCardActions()}
            <FlashcardBackFace
              card={card}
              setActiveBreakdown={setActiveBreakdown}
              showPinyin={showPinyin}
              toneColors={toneColors}
              showTranslation={showTranslation}
              simpleDefinitions={simpleDefinitions}
              examples={examples}
              isExamplesLoading={isExamplesLoading}
              isDragging={isDragging}
              scrollRef={backScrollRef}
              showHook={isHookOpen}
              hook={wordHook}
              hookLoaded
              wordInk={!isFlipped}
            />
          </div>
        </div>

        <SwipeVerdict side="ok" />
        <SwipeVerdict side="no" />
      </div>
    </motion.div>
    </>
  );
});


/** Safe DEV sample: flips and writing stay local; no review callbacks record progress. */
export function FlashcardActionsPreview() {
  return <section className="space-y-3">
    <h2 className="text-xl font-black text-ui-ink-strong">Flashcard actions · safe preview</h2>
    <div className="relative h-128 w-full [container-type:size]">
      <DraggableFlashcard
        card={{ id: 'preview-buy', bookId: 1, lessonId: 3, front: '買', traditional: '買', simplified: '买', pinyin: 'mǎi', back: 'to buy', pos: 'V' }}
        direction={1}
        isFlipped
        setActiveBreakdown={() => {}}
        triggerSwipeRate={() => false}
        onCardTap={() => {}}
      />
    </div>
  </section>;
}
