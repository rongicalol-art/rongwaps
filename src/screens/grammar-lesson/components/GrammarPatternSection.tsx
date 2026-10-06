import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { GrammarPatternRow, InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammarPatternLayout';
import { isHanziChar } from '../../../utils/hanzi';
import { cn } from '../../../utils/cn';
import { SAMPLE_BOOKS } from '../../../data/books';
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
  patternAccentColumn?: number;
}

// Eased stops (not a straight ramp) so the shadow dissolves smoothly instead of ending in a hard edge.
const EDGE_SHADOW_STOPS = [
  [14, 0], [11, 12], [7.5, 28], [4, 48], [1.8, 68], [0.5, 86], [0, 100],
].map(([alpha, at]) => `color-mix(in srgb, var(--color-ui-ink-strong) ${alpha}%, transparent) ${at}%`).join(', ');

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false, top: 0 });
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

  // Soft side shadows hint that the table scrolls; they sit under the header and only
  // show on a side that still has content beyond it.
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollWidth - el.clientWidth - el.scrollLeft > 2,
      top: headRef.current?.offsetHeight ?? 0,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [updateEdges, page.id, activeRows, activeColumns, showPinyin, showTranslation]);

  if (activeRows.length === 0) return null;

  const columnCount = layout.sourceColumns.length;
  const book = SAMPLE_BOOKS.find((b) => b.id === page.bookId) || SAMPLE_BOOKS[0];
  // The frame colour also fills the container behind the white body, so antialiased
  // corners blend into the border instead of showing a white fringe.
  const frameStyle = { borderColor: book.theme.primaryEdge, backgroundColor: book.theme.primaryEdge };
  // Same colour as the frame so the header reads as part of the border.
  const headerStyle = { backgroundColor: book.theme.primaryEdge, borderColor: book.theme.primaryEdge };
  return (
    <section aria-label="Sentence pattern">
      {/* One table at every width; on narrow screens it scrolls sideways like a native table. */}
      <div
        style={frameStyle}
        className={cn(
          'relative w-full overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-lg)]',
        )}
      >
        {/* Scrollable table container */}
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            aria-hidden="true"
            style={{
              top: edges.top,
              backgroundImage: `linear-gradient(${side === 'left' ? 'to right' : 'to left'}, ${EDGE_SHADOW_STOPS})`,
            }}
            className={cn(
              'pointer-events-none absolute bottom-0 z-10 w-8 transition-opacity duration-200',
              side === 'left' ? 'left-0' : 'right-0',
              edges[side] ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
        <div ref={scrollRef} onScroll={updateEdges} className="overflow-x-auto scrollbar-none">
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
            <thead ref={headRef}>
              <tr style={headerStyle} className="border-b-2">
                {layout.sourceColumns.map((sourceIndex) => {
                  const columnTitle = activeColumns[sourceIndex] ?? '';
                  const detail = activeDetails?.[sourceIndex];

                  return (
                    <th
                      key={`th-${sourceIndex}`}
                      scope="col"
                      className="px-5 py-3 text-left font-black sm:px-6"
                    >
                      <span
                        className="ui-eyebrow block whitespace-nowrap text-white [&_.font-chinese]:text-base"
                        title={detail ? `${columnTitle} · ${detail}` : columnTitle}
                      >
                        <HeaderTitle text={columnTitle} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-ui-surface">
              {activeRows.map((row, rowIndex) => {
                const groups = getPatternRowGroups(row);
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={cn(rowIndex > 0 && 'border-t-2 border-ui-divider')}
                    >
                      {layout.sourceColumns.map((sourceIndex) => {
                        const group = groups[sourceIndex] ?? [];
                        const isEmpty = group.length === 0;
                        return (
                          <td
                            key={`${row.id}-group-${sourceIndex}`}
                            aria-label={isEmpty ? 'Empty sentence slot' : undefined}
                            className={cn(
                              'px-5 pt-3 align-middle sm:px-6',
                              showTranslation && row.english ? 'pb-1' : 'pb-3',
                            )}
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
                                focusTerms={page.focusTerms}
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
                          className="px-5 pb-3 pt-0 sm:px-6"
                        >
                          <p className="sr-only">Meaning</p>
                          <p className="ui-translation max-w-md text-[15px] sm:text-base">{row.english}</p>
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
