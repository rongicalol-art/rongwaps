import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { GrammarPatternRow, InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammarPatternLayout';
import { isHanziChar } from '../../../utils/hanzi';
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
}

/**
 * A header title can mix English and Chinese (`Double 了`, `比 + B`). Chinese
 * runs follow the learner's character-font choice (sans / kai / rounded) just
 * like the table cells, while Latin runs stay in the UI face.
 */
function HeaderTitle({ text }: { text: string }) {
  const runs: Array<{ hanzi: boolean; text: string }> = [];
  for (const char of text) {
    const hanzi = isHanziChar(char);
    const last = runs[runs.length - 1];
    if (last && last.hanzi === hanzi) {
      last.text += char;
    } else {
      runs.push({ hanzi, text: char });
    }
  }

  return (
    <>
      {runs.map((run, index) => (run.hanzi ? (
        <span key={index} className="font-chinese">{run.text}</span>
      ) : (
        <Fragment key={index}>{run.text}</Fragment>
      )))}
    </>
  );
}

/**
 * One quiet table surface: a compact slot header and every example row live
 * in a single shared grid so vertical dividers stay aligned while each column
 * sizes proportionally based on content weight. Each header cell carries one
 * line only — the short slot title (grammarTableHeaders test); the compact
 * `patternColumnDetails` notation stays in the cell tooltip. Example rows
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

  return (
    <section aria-label="Sentence pattern">
      <div
        className={cn(
          'relative overflow-hidden rounded-feature border-2 border-brand-primary/40 border-b-[length:var(--depth-md)] bg-ui-surface',
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
                    'flex min-h-[48px] min-w-0 flex-col items-start justify-center border-b-2 border-brand-primary/30 bg-brand-primary/[0.08] px-3 py-2.5 text-left sm:min-h-[56px] sm:px-4 sm:py-3',
                    colIndex > 0 && 'border-l-2 border-brand-primary/20',
                  )}
                >
                  {/* One line per header: the slot title only, authored as
                      1-3 plain words (grammarTableHeaders test); the compact
                      notation lives in the tooltip and the page explanation. */}
                  <span
                    className="block w-full truncate text-left text-base font-extrabold leading-tight text-ui-ink-strong"
                    title={detail ? `${columnTitle} · ${detail}` : columnTitle}
                  >
                    <HeaderTitle text={columnTitle} />
                  </span>
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
                          'flex min-h-[64px] min-w-0 items-center justify-start bg-ui-surface px-3 py-3.5 sm:min-h-[76px] sm:px-5 sm:py-4',
                          colIndex > 0 && 'border-l-2 border-brand-primary/20',
                          rowIndex > 0 && 'border-t-2 border-brand-primary/20',
                        )}
                      >
                        {isEmpty ? (
                          <span className="text-xs font-bold text-ui-muted/40 select-none" aria-hidden="true">—</span>
                        ) : (
                          <InteractiveGrammarSentence
                            words={[...group]}
                            characterPreference={characterPreference}
                            showPinyin={showPinyin}
                            align="start"
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
                      className="border-t-2 border-brand-primary/20 bg-ui-hover/35 px-4 py-2.5 sm:px-6 sm:py-3"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <p className="sr-only">Meaning</p>
                      <p className="ui-translation text-sm">
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
