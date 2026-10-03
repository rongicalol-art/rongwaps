import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { GrammarPatternRow, InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammarPatternLayout';
import { isHanziChar } from '../../../utils/hanzi';
import { cn } from '../../../utils/cn';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';
import { SAMPLE_BOOKS } from '../../../data/books';

interface GrammarPatternSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  patternColumns?: string[];
  patternColumnDetails?: string[];
  patternRows?: GrammarPatternRow[];
  patternAccentColumn?: number;
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
    if (last && last.hanzi === hanzi) last.text += char;
    else runs.push({ hanzi, text: char });
  }

  return (
    <>
      {runs.map((run, index) =>
        run.hanzi ? <span key={index} className="font-chinese">{run.text}</span> : <Fragment key={index}>{run.text}</Fragment>
      )}
    </>
  );
}

/**
 * Semantic, responsive grammar pattern table.
 *
 * Uses native table semantics with `<colgroup>` proportional column weights so
 * columns size naturally according to content without right-edge dead zones or
 * unnatural character stacking. The outer container manages smooth horizontal
 * scrolling with tactile edge-fade indicators when content extends past the
 * viewport.
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

  const book = SAMPLE_BOOKS.find((b) => b.id === page.bookId) || SAMPLE_BOOKS[0];
  const columnCount = layout.sourceColumns.length;
  return (
    <section aria-label="Sentence pattern">
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface shadow-xs',
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

        {/* Scrollable table container */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollIndicators}
          className="overflow-x-auto scrollbar-none"
        >
          <table className="w-full min-w-full border-collapse table-auto text-left">
            <colgroup>
              {layout.sourceColumns.map((sourceIndex, colIndex) => {
                const share = layout.shares[colIndex] ?? (1 / columnCount);
                return (
                  <col
                    key={`col-${sourceIndex}`}
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                );
              })}
            </colgroup>
            <thead>
              <tr
                className="border-b-2 border-ui-border bg-brand-primary-soft/40"
                style={{ backgroundColor: book.theme.primarySoft }}
              >
                {layout.sourceColumns.map((sourceIndex) => {
                  const columnTitle = activeColumns[sourceIndex] ?? '';
                  const detail = activeDetails?.[sourceIndex];

                  return (
                    <th
                      key={`th-${sourceIndex}`}
                      scope="col"
                      className="px-5 py-3.5 text-left font-black sm:px-6 sm:py-4"
                    >
                      <span
                        className="block whitespace-nowrap text-sm font-black leading-tight tracking-wide text-ui-ink-strong sm:text-base"
                        title={detail ? `${columnTitle} · ${detail}` : columnTitle}
                      >
                        <HeaderTitle text={columnTitle} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, rowIndex) => {
                const groups = getPatternRowGroups(row);
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={cn(
                        rowIndex > 0 && 'border-t-2 border-ui-divider',
                        'transition-colors hover:bg-ui-hover/30',
                      )}
                    >
                      {layout.sourceColumns.map((sourceIndex) => {
                        const group = groups[sourceIndex] ?? [];
                        const isEmpty = group.length === 0;
                        return (
                          <td
                            key={`${row.id}-group-${sourceIndex}`}
                            aria-label={isEmpty ? 'Empty sentence slot' : undefined}
                            className="px-5 py-3.5 align-middle sm:px-6 sm:py-4"
                          >
                            {isEmpty ? (
                              <span className="text-xs font-bold text-ui-muted/30 select-none" aria-hidden="true">—</span>
                            ) : (
                              <InteractiveGrammarSentence
                                words={[...group]}
                                characterPreference={characterPreference}
                                showPinyin={showPinyin}
                                align="start"
                                tone="default"
                                size="lg"
                                className="flex-nowrap whitespace-nowrap gap-x-0.5 gap-y-2"
                                onOpenWord={onOpenWord}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Full-width meaning row rendered as a natural subtitle under the sentence */}
                    {showTranslation && row.english && (
                      <tr className="bg-transparent">
                        <td
                          colSpan={columnCount}
                          className="px-5 pb-3.5 -mt-1 pt-0 sm:px-6 sm:pb-4"
                        >
                          <p className="sr-only">Meaning</p>
                          <p className="ui-translation text-xs font-semibold text-ui-muted sm:text-sm pl-0.5">
                            {row.english}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
