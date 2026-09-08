import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { GrammarPatternRow, InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammarPatternLayout';
import { cn } from '../../../utils/cn';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarPatternSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  patternColumns?: string[];
  patternColumnDetails?: string[];
  patternRows?: GrammarPatternRow[];
  hideHeader?: boolean;
  title?: string;
}

/**
 * One quiet table surface: a compact slot header and every example row live
 * in a single shared grid so vertical dividers stay aligned while each column
 * sizes proportionally based on content weight. Header labels and details wrap
 * naturally on narrow viewports to avoid starving neighbor columns; example rows
 * stay clean (chunks and pinyin only, no labels mixed in). Responsive minimums
 * and scroll edge fades ensure smooth horizontal navigation on narrow devices
 * without clipping glyphs.
 */
export function GrammarPatternSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  patternColumns,
  patternColumnDetails,
  patternRows,
  hideHeader = false,
  title = 'Sentence Pattern',
}: GrammarPatternSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const activeColumns = patternColumns ?? page.patternColumns;
  const activeDetails = patternColumnDetails ?? page.patternColumnDetails;
  const activeRows = patternRows ?? page.patternRows;

  const layout = getPatternSectionLayout({
    patternColumns: activeColumns,
    patternColumnDetails: activeDetails,
    patternRows: activeRows,
    characterPreference,
    showPinyin,
    sideColumnSizing: 'proportional',
  });

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(maxScroll - scrollLeft > 4);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollContainerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [updateScrollIndicators, page.id, activeRows, activeColumns]);

  if (activeRows.length === 0) return null;

  const headingId = `grammar-pattern-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={headingId} className={cn(!hideHeader && 'mt-10')}>
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted-strong">
            {title}
          </h2>
        </div>
      )}

      <div
        className={cn(
          'relative overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface',
        )}
      >
        {/* Left scroll fade indicator */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-ui-surface to-transparent transition-opacity duration-200',
            canScrollLeft ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Right scroll fade indicator */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-ui-surface to-transparent transition-opacity duration-200',
            canScrollRight ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* The table surface always contains horizontal overflow by scrolling;
            it is never clipped by the card. */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollIndicators}
          className="overflow-x-auto scrollbar-none"
        >
          <div
            className={cn(
              'grid w-full items-stretch',
              layout.isScrollable && (layout.sourceColumns.length >= 3 ? 'min-w-[340px]' : 'min-w-[260px]'),
            )}
            style={{ gridTemplateColumns: layout.gridTemplateColumns }}
          >
            {layout.sourceColumns.map((sourceIndex, colIndex) => {
              const columnTitle = activeColumns[sourceIndex] ?? '';
              const detail = activeDetails?.[sourceIndex];

              return (
                <div
                  key={`legend-${sourceIndex}`}
                  className={cn(
                    'flex min-h-[56px] min-w-0 flex-col items-center justify-center border-b border-ui-divider bg-brand-primary/[0.06] px-2.5 py-2.5 text-center sm:min-h-[64px] sm:px-4 sm:py-3',
                    colIndex > 0 && 'border-l border-ui-divider',
                  )}
                >
                  <span className="block text-center text-[11px] font-black uppercase tracking-wider leading-tight text-ui-ink-strong break-words sm:text-xs">
                    {columnTitle}
                  </span>
                  {detail && (
                    <span className="mt-1 block text-center text-[10px] font-bold leading-tight text-brand-primary break-words sm:text-[11px]">
                      {detail}
                    </span>
                  )}
                </div>
              );
            })}

            {activeRows.map((row, rowIndex) => {
              const groups = getPatternRowGroups(row);
              return (
                <Fragment key={row.id}>
                  {layout.sourceColumns.map((sourceIndex, colIndex) => {
                    const group = groups[sourceIndex] ?? [];
                    const isEmpty = group.length === 0;
                    return (
                      <div
                        key={`${row.id}-group-${sourceIndex}`}
                        aria-label={isEmpty ? 'Empty sentence slot' : undefined}
                        className={cn(
                          'flex min-h-[76px] min-w-0 items-center justify-center bg-ui-surface px-2 py-3.5 sm:min-h-[88px] sm:px-5 sm:py-5',
                          colIndex > 0 && 'border-l border-ui-divider',
                          rowIndex > 0 && 'border-t border-ui-divider',
                        )}
                      >
                        {isEmpty ? (
                          <span className="text-xs font-bold text-ui-muted/40 select-none" aria-hidden="true">—</span>
                        ) : (
                          <InteractiveGrammarSentence
                            words={[...group]}
                            characterPreference={characterPreference}
                            showPinyin={showPinyin}
                            align="center"
                            tone="default"
                            size="lg"
                            className="gap-x-0.5 gap-y-2"
                            onOpenWord={onOpenWord}
                          />
                        )}
                      </div>
                    );
                  })}

                  {showTranslation && (
                    <div
                      className="border-t border-ui-divider/70 bg-ui-hover/35 px-4 py-2.5 sm:px-6 sm:py-3"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <p className="sr-only">Meaning</p>
                      <p className="text-center text-[13px] sm:text-[14px] font-black leading-relaxed text-ui-ink">
                        {row.english}
                      </p>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
