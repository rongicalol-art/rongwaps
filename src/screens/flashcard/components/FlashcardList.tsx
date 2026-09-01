import { memo, useMemo } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

/**
 * Flashcard deck list mode.
 *
 * Minimal and intentional: the deck is grouped one column per part (Part 1,
 * Part 2, …), each introduced by a quiet uppercase label with a little
 * space. On wide screens the part columns sit side by side; on narrow
 * screens they simply stack (gap = the space between parts). Each part is
 * its own home-screen lesson chain — accent-edged connected blocks that
 * merge with spring layout animation; excluded rows sit apart, dimmed, and
 * break the chain. Rows are dictionary-style: vocab word, hairline divider,
 * pinyin + definition, and the book/lesson token plus the POS tag (reusing
 * `PosBadge`). No counters, no controls — the whole block is the toggle.
 */
interface FlashcardListProps {
  /** Full deck (exclusions NOT applied) in canonical order. */
  cards: Flashcard[];
  excludedIds: ReadonlySet<string>;
  onToggleCard: (cardId: string) => void;
  accentColor: string;
  edgeHex: string;
}

type RowShape = 'single' | 'middle' | 'top' | 'bottom';

const ROW_TRANSITION = {
  layout: { type: 'spring' as const, stiffness: 430, damping: 34 },
  scale: { type: 'spring' as const, stiffness: 500, damping: 28 },
};

function chainClasses(shape: RowShape, included: boolean): string {
  if (!included) {
    return 'mb-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface';
  }
  switch (shape) {
    case 'single':
      return 'mb-3 rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface';
    case 'top':
      return 'mb-0 rounded-t-feature border-ui-border bg-ui-surface';
    case 'bottom':
      return 'mb-3 rounded-b-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface';
    case 'middle':
      return 'mb-0 border-ui-border bg-ui-surface';
  }
}

function rowShape(column: Flashcard[], index: number, excludedIds: ReadonlySet<string>): RowShape {
  if (excludedIds.has(column[index].id)) return 'single';
  const prevExcluded = index === 0 || excludedIds.has(column[index - 1].id);
  const nextExcluded = index === column.length - 1 || excludedIds.has(column[index + 1].id);
  if (prevExcluded && nextExcluded) return 'single';
  if (!prevExcluded && !nextExcluded) return 'middle';
  if (!prevExcluded) return 'bottom';
  return 'top';
}

/** Book/lesson context token, styled to match the app's `PosBadge` geometry. */
function BookToken({ bookId, lessonId, excluded }: { bookId: number; lessonId: number; excluded: boolean }) {
  if (bookId <= 0 || lessonId <= 0) return null;
  return (
    <span
      className={cn(
        'shrink-0 select-none rounded-[6px] px-1.5 py-[3px] text-[10px] font-black uppercase leading-none tracking-wide',
        excluded ? 'bg-ui-canvas text-ui-muted/60' : 'bg-ui-canvas text-ui-muted-strong',
      )}
    >
      B{bookId} L{lessonId}
    </span>
  );
}

export const FlashcardList = memo(function FlashcardList({
  cards,
  excludedIds,
  onToggleCard,
  accentColor,
  edgeHex,
}: FlashcardListProps) {
  const reduceMotion = useReducedMotion();

  // One column per part, in part order. Runs within each part are their own
  // chain, so connected blocks never cross a part boundary.
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

  if (cards.length === 0) {
    return (
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ui-surface text-ui-muted-strong">
          <AppIcon name="cards" size={28} />
        </span>
        <div className="max-w-sm">
          <p className="text-[17px] font-extrabold text-ui-ink">No vocab here yet</p>
          <p className="mt-1 text-sm font-medium text-ui-muted">
            This selection has no words to list. Pick a lesson or add words to your library.
          </p>
        </div>
      </div>
    );
  }

  const renderRows = (partId: number, column: Flashcard[]) => (
    <ol className="flex flex-col gap-0">
      {column.map((card, index) => {
        const excluded = excludedIds.has(card.id);
        const isFirst = index === 0;
        const shape = rowShape(column, index, excludedIds);

        return (
          <li key={card.id}>
            {/* `flex items-center` on the button mirrors the home lesson
                container — without it the toggle would only stretch over its
                content. The block is a column so the part label can live
                inside the first card, at its top. */}
            <motion.div
              layout={!reduceMotion}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={ROW_TRANSITION}
              style={!excluded ? { borderColor: edgeHex } : undefined}
              className={cn(
                'relative flex w-full flex-col items-stretch transition-colors duration-300 hover:bg-ui-surface-hover',
                chainClasses(shape, !excluded),
              )}
            >
              {(shape === 'top' || shape === 'middle') && (
                <span aria-hidden="true" className="absolute bottom-0 left-5 right-5 h-0.5 bg-ui-divider" />
              )}
              {isFirst && (
                <span className={cn(
                  'px-4 pt-3 pb-0.5 text-[11px] font-extrabold uppercase tracking-widest transition-colors',
                  excluded ? 'text-ui-muted' : accentColor,
                )}>
                  Part {partId}
                </span>
              )}
              <button
                type="button"
                onClick={() => onToggleCard(card.id)}
                aria-pressed={!excluded}
                aria-label={excluded ? `Include ${card.front}` : `Exclude ${card.front}`}
                className="group flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-[inherit] px-3.5 py-3 text-left outline-none focus-ring"
              >
                <span className={cn(
                  'shrink-0 font-chinese text-[22px] font-black leading-none transition-colors',
                  excluded ? 'text-ui-muted/60' : 'text-ui-ink',
                )}>
                  {card.front}
                </span>

                <span aria-hidden="true" className="h-8 w-px shrink-0 bg-ui-divider" />

                <span className="min-w-0 flex-1">
                  {card.pinyin && (
                    <span className={cn(
                      'block truncate text-[13px] font-extrabold leading-tight transition-colors',
                      excluded ? 'text-ui-muted' : 'text-ui-ink-strong',
                    )}>
                      {card.pinyin}
                    </span>
                  )}
                  {card.back && (
                    <span className={cn(
                      'block truncate text-[13px] font-medium leading-snug transition-colors',
                      excluded ? 'text-ui-muted/50' : 'text-ui-muted',
                    )}>
                      {card.back}
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-1.5">
                  <BookToken bookId={card.bookId} lessonId={card.lessonId} excluded={excluded} />
                  <PosBadge pos={card.pos} className={excluded ? 'opacity-50' : undefined} />
                </span>
              </button>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="absolute inset-0 z-0 flex flex-col">
      {/* │ Top fade: standard sticky-header blur + gradient, sized to the
          header band so content clears it without a big empty gap */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[68px] bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent backdrop-blur-[2px]"
      />
      {/* │ Bottom fade: taller/stronger blend under the floating mode dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent"
      />

      <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto w-full max-w-[880px] px-4 pb-4 pt-[76px] md:px-6">
          <LayoutGroup>
            {/* Single column; each part is its own chain. The part label
                lives inside the first block of each part. */}
            {groups.map((group, groupIndex) => (
              <div key={group.partId} className={cn('flex flex-col', groupIndex > 0 && 'mt-6')}>
                {renderRows(group.partId, group.partCards)}
              </div>
            ))}
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
});
