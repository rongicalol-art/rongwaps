import { Fragment } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getPatternRowGroups, getPatternSectionLayout } from '../../../utils/grammarPatternLayout';
import { cn } from '../../../utils/cn';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarPatternSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

/**
 * One quiet table surface: a compact slot header and every example row live
 * in a single shared grid so vertical dividers stay aligned while each column
 * sizes to its content. Header labels and compact details are `nowrap`, so
 * the columns open up just enough for the headings to keep a single line
 * instead of wrapping in narrow slot columns; example rows stay clean
 * (chunks and pinyin only, no labels mixed in). Narrow viewports give the
 * leftover space to a single flexible track; wide viewports spread tracks by
 * content weight (content-based minimums), so the table always fills its card
 * without a column ballooning past its content.
 */
export function GrammarPatternSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarPatternSectionProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const layout = getPatternSectionLayout({
    patternColumns: page.patternColumns,
    patternColumnDetails: page.patternColumnDetails,
    patternRows: page.patternRows,
    characterPreference,
    showPinyin,
    // Narrow viewports let one flexible track absorb leftover space so short
    // slots hug their content; wide viewports spread the table proportionally
    // so no single column balloons past its content.
    sideColumnSizing: isDesktop ? 'proportional' : 'min-content',
  });
  if (page.patternRows.length === 0) return null;

  return (
    <section aria-labelledby="grammar-pattern-heading" className="mt-8">
      <h2 id="grammar-pattern-heading" className="sr-only">Sentence pattern</h2>

      <div className="mt-3 overflow-hidden rounded-[20px] border border-ui-divider bg-ui-canvas/45 shadow-sm">
        {/* The table surface always contains horizontal overflow by scrolling;
            it is never clipped by the card. */}
        <div className="overflow-x-auto">
          <div
            className={cn('mx-auto grid w-full max-w-[45rem] items-stretch', layout.isScrollable && 'min-w-[480px]')}
            style={{ gridTemplateColumns: layout.gridTemplateColumns }}
          >
            {layout.sourceColumns.map((sourceIndex, colIndex) => (
              <div
                key={`legend-${sourceIndex}`}
                className={cn(
                  'flex min-h-[56px] min-w-0 flex-col items-center justify-center border-b border-ui-divider bg-brand-primary/10 px-2 py-2 text-center sm:min-h-[60px] sm:px-4 sm:py-2.5',
                  colIndex > 0 && 'border-l border-ui-divider',
                )}
              >
                <span className="block whitespace-nowrap text-[11px] font-black leading-tight text-ui-ink-strong sm:text-xs">
                  {page.patternColumns[sourceIndex] ?? ''}
                </span>
                {page.patternColumnDetails?.[sourceIndex] && (
                  <span className="mt-1 block whitespace-nowrap text-[10px] font-bold leading-tight text-brand-primary-deep/80">
                    {page.patternColumnDetails[sourceIndex]}
                  </span>
                )}
              </div>
            ))}

            {page.patternRows.map((row, rowIndex) => {
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
                          'flex min-h-[76px] min-w-0 items-center justify-center bg-ui-surface px-2 py-4 sm:min-h-[88px] sm:px-5 sm:py-5',
                          colIndex > 0 && 'border-l border-ui-divider',
                          rowIndex > 0 && 'border-t border-ui-divider',
                        )}
                      >
                        {isEmpty ? (
                          <span className="sr-only">Empty sentence slot</span>
                        ) : (
                          <InteractiveGrammarSentence
                            words={[...group]}
                            characterPreference={characterPreference}
                            showPinyin={showPinyin}
                            align="center"
                            tone="default"
                            size="lg"
                            className="gap-x-1 gap-y-2"
                            onOpenWord={onOpenWord}
                          />
                        )}
                      </div>
                    );
                  })}

                  {showTranslation && (
                    <div
                      className="border-t border-ui-divider bg-ui-canvas/70 px-4 py-3 sm:px-5 sm:py-3.5"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <p className="sr-only">Meaning</p>
                      <p className="text-center text-[14px] font-bold leading-6 text-ui-ink sm:text-[15px]">
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
