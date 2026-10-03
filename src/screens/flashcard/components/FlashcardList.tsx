import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { cn } from '../../../utils/cn';

/**
 * Flashcard deck list mode.
 *
 * Modeled after the home screen lesson chain (`LessonItem`):
 * - Connected card blocks for enabled cards with the book's accent edge border
 * - Excluded cards visibly disconnect into standalone rounded items
 * - Responsive 2-column layout on tablet/desktop to utilize screen space
 * - Card toggle container uses spring layout; no active border mutation
 */
interface FlashcardListProps {
  /** Full deck (exclusions NOT applied) in canonical order. */
  cards: Flashcard[];
  excludedIds: ReadonlySet<string>;
  onToggleCard: (cardId: string) => void;
  accentColor: string;
  edgeHex: string;
  onScrollVisibility?: (visible: boolean) => void;
}

const SPRING_TRANSITION = {
  layout: { type: 'spring' as const, stiffness: 430, damping: 34 },
  scale: { type: 'spring' as const, stiffness: 500, damping: 28 },
};

function getCardContainerClasses(isSelected: boolean, isPrevSelected: boolean, isNextSelected: boolean) {
  if (!isSelected) {
    return {
      containerClasses:
        'mb-3 rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface/60 opacity-60 hover:opacity-85',
      hasInnerDivider: false,
    };
  }

  if (!isPrevSelected && !isNextSelected) {
    return {
      containerClasses:
        'mb-3 rounded-feature border-2 border-ui-border border-b-[length:var(--depth-lg)] bg-ui-surface shadow-ambient-sm hover:bg-ui-surface-hover',
      hasInnerDivider: false,
    };
  }

  if (!isPrevSelected && isNextSelected) {
    return {
      containerClasses:
        'mb-0 rounded-t-feature border-2 border-ui-border border-b-0 bg-ui-surface hover:bg-ui-surface-hover',
      hasInnerDivider: true,
    };
  }

  if (isPrevSelected && isNextSelected) {
    return {
      containerClasses:
        'mb-0 border-x-2 border-y-0 border-ui-border bg-ui-surface hover:bg-ui-surface-hover',
      hasInnerDivider: true,
    };
  }

  // isPrevSelected && !isNextSelected
  return {
    containerClasses:
      'mb-3 rounded-b-feature border-x-2 border-t-0 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface shadow-ambient-sm hover:bg-ui-surface-hover',
    hasInnerDivider: false,
  };
}

export const FlashcardList = memo(function FlashcardList({
  cards,
  excludedIds,
  onToggleCard,
  accentColor,
  edgeHex,
  onScrollVisibility,
}: FlashcardListProps) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isDockVisible, setIsDockVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const currentScrollTop = e.currentTarget.scrollTop;
      const delta = currentScrollTop - lastScrollTopRef.current;

      // Keep dock visible when near top
      if (currentScrollTop <= 15) {
        setIsDockVisible(true);
        onScrollVisibility?.(true);
      } else if (delta > 8 && currentScrollTop > 40) {
        // Scrolling down: hide dock to give space
        setIsDockVisible(false);
        onScrollVisibility?.(false);
      } else if (delta < -8) {
        // Scrolling up: bring dock back
        setIsDockVisible(true);
        onScrollVisibility?.(true);
      }

      lastScrollTopRef.current = currentScrollTop;
    },
    [onScrollVisibility],
  );

  // Restore dock when leaving list mode
  useEffect(() => {
    return () => {
      onScrollVisibility?.(true);
    };
  }, [onScrollVisibility]);

  // Group cards by part in canonical part order.
  const groups = useMemo(() => {
    const byPart = new Map<number, Flashcard[]>();
    for (const card of cards) {
      const partId = card.partId ?? 1;
      const list = byPart.get(partId) ?? [];
      list.push(card);
      byPart.set(partId, list);
    }
    return [...byPart.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([partId, partCards]) => ({ partId, partCards }));
  }, [cards]);

  const hasExplicitParts = useMemo(
    () => cards.some((c) => typeof c.partId === 'number' && c.partId > 0),
    [cards],
  );

  if (cards.length === 0) {
    return (
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ui-surface text-ui-muted-strong">
          <AppIcon name="cards" size={28} />
        </span>
        <div className="max-w-sm">
          <p className="text-lg font-extrabold text-ui-ink">No vocab here yet</p>
          <p className="mt-1 text-sm font-bold text-ui-muted-strong">
            This selection has no words to list. Pick a lesson or add words to your library.
          </p>
        </div>
      </div>
    );
  }

  const renderCardColumn = (columnCards: Flashcard[]) =>
    columnCards.map((card, index) => {
      const isSelected = !excludedIds.has(card.id);
      const isPrevSelected = index > 0 && !excludedIds.has(columnCards[index - 1].id);
      const isNextSelected =
        index < columnCards.length - 1 && !excludedIds.has(columnCards[index + 1].id);

      const { containerClasses, hasInnerDivider } = getCardContainerClasses(
        isSelected,
        isPrevSelected,
        isNextSelected,
      );

      return (
        <motion.div
          key={card.id}
          layout={!reduceMotion}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          transition={SPRING_TRANSITION}
          style={isSelected ? { borderColor: edgeHex } : undefined}
          className={cn(
            'relative flex min-h-14 min-w-0 items-center overflow-hidden transition-colors duration-300',
            containerClasses,
          )}
        >
          {hasInnerDivider && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-4 right-4 z-10 h-0.5 bg-ui-divider"
            />
          )}

          <button
            type="button"
            onClick={() => onToggleCard(card.id)}
            aria-pressed={isSelected}
            aria-label={isSelected ? `Exclude ${card.front}` : `Include ${card.front}`}
            className="group flex min-w-0 flex-1 items-center gap-3.5 self-stretch px-4 py-3 text-left outline-none focus-ring sm:py-3.5"
          >
            <span
              className={cn(
                'shrink-0 font-chinese text-2xl font-black leading-none transition-colors sm:text-3xl',
                isSelected ? 'text-ui-ink' : 'text-ui-muted/60',
              )}
            >
              {card.front}
            </span>

            <span aria-hidden="true" className="h-8 sm:h-9 w-px shrink-0 bg-ui-divider" />

            <span className="min-w-0 flex-1">
              {card.pinyin && (
                <span
                  className={cn(
                    'block truncate text-xs font-extrabold leading-tight transition-colors sm:text-sm',
                    isSelected ? 'text-ui-ink-strong' : 'text-ui-muted',
                  )}
                >
                  {card.pinyin}
                </span>
              )}
              {card.back && (
                <span
                  className={cn(
                    'block truncate text-xs font-bold leading-snug transition-colors sm:text-sm',
                    isSelected ? 'text-ui-muted-strong' : 'text-ui-muted-strong/50',
                  )}
                >
                  {card.back}
                </span>
              )}
            </span>

            <span className="flex shrink-0 items-center pl-1">
              <PosBadge pos={card.pos} className={!isSelected ? 'opacity-50' : undefined} />
            </span>
          </button>
        </motion.div>
      );
    });

  return (
    <div className="absolute inset-0 z-0 flex flex-col">
      {/* Top fade: standard sticky-header blur + gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent backdrop-blur-[2px]"
      />
      {/* Bottom fade: blend under the floating mode dock, hides when dock hides */}
      <AnimatePresence initial={false}>
        {isDockVisible && (
          <motion.div
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }
            }
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent"
          />
        )}
      </AnimatePresence>

      <div
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain pb-dock-clearance"
      >
        <div className="mx-auto w-full max-w-5xl px-4 pb-6 pt-20 sm:px-6 md:px-8 xl:max-w-6xl">
          <div className="flex flex-col gap-6 sm:gap-8">
            {groups.map((group) => {
              const isMultiColumn = isDesktop && group.partCards.length > 5;
              const midIndex = isMultiColumn
                ? Math.ceil(group.partCards.length / 2)
                : group.partCards.length;
              const colA = isMultiColumn ? group.partCards.slice(0, midIndex) : group.partCards;
              const colB = isMultiColumn ? group.partCards.slice(midIndex) : [];

              return (
                <section
                  key={group.partId}
                  aria-labelledby={`part-heading-${group.partId}`}
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h2
                        id={`part-heading-${group.partId}`}
                        className={cn('text-xs font-black uppercase tracking-wider', accentColor)}
                      >
                        {hasExplicitParts ? `Part ${group.partId}` : 'Vocabulary'}
                      </h2>
                      <span className="text-xs font-bold text-ui-muted-strong">
                        · {group.partCards.length}{' '}
                        {group.partCards.length === 1 ? 'word' : 'words'}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-0 md:flex-row md:gap-4 lg:gap-6">
                    <div className="flex min-w-0 flex-1 flex-col">
                      {renderCardColumn(colA)}
                    </div>
                    {colB.length > 0 && (
                      <div className="flex min-w-0 flex-1 flex-col">
                        {renderCardColumn(colB)}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
