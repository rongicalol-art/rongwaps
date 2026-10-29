import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { GrammarPatternRow, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammar/grammarPatternLayout';
import { isHanziChar } from '../../../utils/characters/hanzi';
import { cn } from '../../../utils/cn';
import { IconActionButton, SpeakerIcon } from '../../../lib/widgets';
import { playSentence } from '../../../services/audio/sentenceAudio';
import { GrammarExampleItem } from './GrammarExamplesSection';
import { PlaceValueTable } from './PlaceValueTable';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';
import { useAudioPending } from '../../../hooks/useAudioPending';

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
  contextTokens: GrammarWordToken[];
}

// Eased stops (not a straight ramp) so the shadow dissolves smoothly instead of ending in a hard edge.
const EDGE_SHADOW_STOPS = [
  [14, 0], [11, 12], [7.5, 28], [4, 48], [1.8, 68], [0.5, 86], [0, 100],
].map(([alpha, at]) => `color-mix(in srgb, var(--color-ui-scrim) ${alpha}%, transparent) ${at}%`).join(', ');

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

/** A short phrase (臺灣人。) stays on one line, so a phone never strands its last word; longer cells may wrap. */
const SHORT_CELL_HANZI = 3;
const isShortCell = (group: GrammarWordToken[]) =>
  [...group.map((token) => token.traditional).join('')].filter(isHanziChar).length <= SHORT_CELL_HANZI;

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
  contextTokens,
}: GrammarPatternSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false, top: 0 });
  const speaker = useAudioPending();
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
  // Rows the book reads aloud get a quiet play button in a narrow last column.
  const playable = activeRows.some((row) => row.audio);
  const spanCount = columnCount + (playable ? 1 : 0);
  // Up to 3 columns fit a phone, so cells may wrap; wider tables keep scrolling sideways.
  const wide = columnCount > 3;
  // Place-value grids (7+ narrow digit columns) get their own two-block table that never scrolls sideways.
  // Only genuine digit grids qualify: a wide word table (e.g. Lesson 7's 從 … 到 … row) is not place-value.
  const digitGrid = activeRows.every((row) => {
    const cells = row.columns;
    return (
      cells !== undefined &&
      cells.length > 0 &&
      cells.every((cell) => cell.length === 0 || (cell.length === 1 && /^\d+$/.test(cell[0].traditional)))
    );
  });
  if (columnCount >= 7 && digitGrid) {
    return (
      <PlaceValueTable
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        columns={layout.sourceColumns.map((index) => activeColumns[index] ?? '')}
        rows={activeRows}
      />
    );
  }
  // The band colour also fills the container behind the body, so antialiased corners blend into the
  // border instead of showing a light fringe; the header uses the same colour so it reads as part of the border.
  return (
    <section aria-label="Sentence pattern">
      {/* One table at every width; on narrow screens it scrolls sideways like a native table. */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-feature border-2 border-brand-band bg-brand-band border-b-[length:var(--depth-lg)]',
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
              <tr className="border-b-2 border-brand-band bg-brand-band">
                {layout.sourceColumns.map((sourceIndex) => {
                  const columnTitle = activeColumns[sourceIndex] ?? '';
                  const detail = activeDetails?.[sourceIndex];

                  return (
                    <th
                      key={`th-${sourceIndex}`}
                      scope="col"
                      className="px-3 py-3 text-left font-black sm:px-6"
                    >
                      <span
                        className={cn('ui-eyebrow block text-brand-on-band [&_.font-chinese]:text-base', wide && 'whitespace-nowrap')}
                        title={detail ? `${columnTitle} · ${detail}` : columnTitle}
                      >
                        <HeaderTitle text={columnTitle} />
                      </span>
                    </th>
                  );
                })}
                {playable && <th aria-hidden="true" className="hidden sm:table-cell" />}
              </tr>
            </thead>
            <tbody className="bg-ui-surface">
              {activeRows.map((row, rowIndex) => {
                const groups = getPatternRowGroups(row);
                const meaning = showTranslation && row.english;
                const playButton = row.audio && (
                  <IconActionButton
                    onClick={() => {
                      speaker.claim(String(rowIndex));
                      void playSentence(
                      groups.flat().map((token) => (characterPreference === 'simplified' && token.simplified) || token.traditional).join(''),
                      row.audio,
                      characterPreference,
                    );
                    }}
                    size="sm"
                    variant="quiet"
                    icon={<SpeakerIcon status={speaker.status(String(rowIndex))} size={22} />}
                    label={`Play row ${rowIndex + 1}${row.audio?.voice === 'book' ? ' (book recording)' : ''}`}
                    className="shrink-0 text-brand-primary hover:text-brand-primary hover:brightness-90"
                  />
                );
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
                              'px-3 pt-3 align-middle sm:px-6',
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
                                className={cn('gap-x-0.5 gap-y-2', (wide || isShortCell(group)) && 'flex-nowrap whitespace-nowrap')}
                                onOpenWord={onOpenWord}
                              />
                            )}
                          </td>
                        );
                      })}
                      {/* From tablet width the button has its own column; on a phone it sits on the meaning line so the words keep their width. */}
                      {playable && <td className="hidden pr-3 pt-3 align-middle sm:table-cell">{playButton}</td>}
                    </tr>

                    {/* Full-width meaning row rendered as a natural subtitle under the sentence */}
                    {(meaning || playButton) && (
                      <tr className={cn('bg-transparent', !meaning && 'sm:hidden')}>
                        <td
                          colSpan={spanCount}
                          className={cn('px-3 pb-3 sm:px-6', meaning ? 'pt-0' : '-mt-2 pt-0')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {meaning && (
                              <div>
                                <p className="sr-only">Meaning</p>
                                <p className="ui-translation max-w-md text-[15px] sm:text-base">{row.english}</p>
                              </div>
                            )}
                            {playButton && <span className="ml-auto sm:hidden">{playButton}</span>}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* The sentence the book prints under this pair, same item as the examples list. */}
                    {(() => {
                      const exampleIndex = row.exampleId ? page.examples.findIndex((e) => e.id === row.exampleId) : -1;
                      if (exampleIndex < 0) return null;
                      return (
                        <tr>
                          <td colSpan={spanCount} className="p-0">
                            <GrammarExampleItem
                              page={page}
                              example={page.examples[exampleIndex]}
                              index={exampleIndex}
                              characterPreference={characterPreference}
                              showPinyin={showPinyin}
                              showTranslation={showTranslation}
                              onOpenWord={onOpenWord}
                              contextTokens={contextTokens}
                            />
                          </td>
                        </tr>
                      );
                    })()}
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
