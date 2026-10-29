import { Fragment, useState } from 'react';
import type { GrammarPatternRow, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';
import { getSemanticRoleClasses } from '../../../utils/grammar/grammarSemanticRoles';
import { getGrammarText } from './GrammarText';

interface PlaceValueTableProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  columns: string[];
  rows: GrammarPatternRow[];
}

interface ReadingUnit {
  char: string;
  pinyin: string;
  /** Said or dropped in speech, e.g. the （十） in 八百五（十）. */
  optional: boolean;
}

// Chinese counts in blocks of four (萬 block, then ones); commas group by three.
const BLOCK_TOKENS = [
  { label: '萬', hanzi: true, text: 'block', bar: 'bg-brand-secondary', ink: 'text-brand-secondary' },
  { label: 'Ones', hanzi: false, text: 'block', bar: 'bg-brand-primary', ink: 'text-brand-primary' },
] as const;

const WAN = /[萬万]/;

/** Pair each reading character with its pinyin syllable, in order. */
function readingUnits(text: string, pinyin: string): ReadingUnit[] {
  const syllables = pinyin.split(/\s+/).filter(Boolean);
  return Array.from(text.matchAll(/（(.)）|(.)/gu)).map((match, index) => ({
    char: match[1] ?? match[2],
    pinyin: (syllables[index] ?? '').replace(/[()]/g, ''),
    optional: match[1] !== undefined,
  }));
}

/** The 萬 block is everything up to and including the first 萬; the rest is the ones block. */
function splitBlocks(units: ReadingUnit[]): [ReadingUnit[], ReadingUnit[]] {
  const cut = units.findIndex((unit) => WAN.test(unit.char));
  return cut < 0 ? [[], units] : [units.slice(0, cut + 1), units.slice(cut + 1)];
}

function rowNumber(row: GrammarPatternRow): string {
  const digits = (row.columns ?? []).flat().map((token) => token.traditional).join('');
  return Number(digits).toLocaleString('en-US');
}

function DigitCell({ token }: { token?: GrammarWordToken }) {
  if (!token) return null;
  const isZero = token.traditional === '0';
  return (
    <span
      className={cn(
        'font-sans text-xl font-black tabular-nums',
        token.mark === 'say' ? getSemanticRoleClasses('number')
          : token.mark === 'skip' ? 'text-ui-muted/50'
          : 'text-ui-ink-strong',
        isZero && !token.mark && 'text-ui-muted',
      )}
    >
      {token.traditional}
    </span>
  );
}

/**
 * A place-value grid (7+ narrow columns): digits sit in two 4-digit blocks on one thin line
 * per row, and tapping a row opens how it is read, chunked by block. One table at every width,
 * never scrolling sideways.
 */
export function PlaceValueTable({ page, characterPreference, showPinyin, columns, rows }: PlaceValueTableProps) {
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null);
  const columnCount = columns.length;
  const half = Math.ceil(columnCount / 2);

  return (
    <section aria-label="Place values">
      <div
        className="relative w-full overflow-hidden rounded-feature border-2 border-brand-band bg-brand-band border-b-[length:var(--depth-lg)]"
      >
        <table className="w-full table-fixed border-collapse text-center">
          <thead>
            <tr className="border-b-2 border-brand-band bg-brand-band">
              {columns.map((title, index) => (
                <th
                  key={title}
                  scope="col"
                  className={cn('py-3 font-black', index === half && 'border-l-2 border-brand-on-band/25')}
                >
                  <span className="ui-eyebrow block whitespace-nowrap text-brand-on-band [&_.font-chinese]:text-base">
                    <span className="font-chinese">{title}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-ui-surface">
            <tr aria-hidden="true">
              {BLOCK_TOKENS.map((block, index) => (
                <td key={block.label} colSpan={index === 0 ? half : columnCount - half} className={cn('px-2 pt-2.5 text-left', index === 1 && 'border-l-2 border-ui-divider')}>
                  <span className="block text-[11px] font-black uppercase tracking-widest text-ui-muted-strong">
                    {block.hanzi ? <span className="font-chinese text-xs">{block.label}</span> : block.label} {block.text}
                  </span>
                  <span className={cn('mt-1 block h-1 rounded-full', block.bar)} />
                </td>
              ))}
            </tr>
            {rows.map((row) => {
              const example = page.examples.find((item) => item.id === row.exampleId);
              const open = openId === row.id && Boolean(example);
              const number = rowNumber(row);
              const text = example ? getGrammarText(example.text, characterPreference) : '';
              const units = example ? readingUnits(text, example.text.pinyin ?? '') : [];
              const chunks = splitBlocks(units);
              const toggle = () => setOpenId(open ? null : row.id);

              return (
                <Fragment key={row.id}>
                  <tr
                    tabIndex={0}
                    aria-expanded={example ? open : undefined}
                    aria-label={`${number}, ${open ? 'hide' : 'show'} how it is read`}
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                      }
                    }}
                    className={cn(
                      'cursor-pointer border-t-2 border-ui-divider transition-colors focus-ring-inline',
                      open ? 'bg-brand-primary-soft' : 'hover:bg-brand-primary-soft/60 active:bg-brand-primary-soft',
                    )}
                  >
                    {columns.map((title, index) => (
                      <td
                        key={`${row.id}-${title}`}
                        className={cn('h-11 px-0 align-middle', index === half && 'border-l-2 border-ui-divider')}
                      >
                        <DigitCell token={row.columns?.[index]?.[0]} />
                      </td>
                    ))}
                  </tr>

                  {open && example && (
                    <tr className="bg-brand-primary-soft">
                      <td colSpan={columnCount} className="px-3 pb-3 pt-1 text-left">
                        <div className="flex items-start gap-1">
                          <IconActionButton
                            onClick={() => audioService.speakText(
                              text.replace(/[（）]/g, ''),
                              characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN',
                              0.9 * useAppStore.getState().pronunciationRate,
                            )}
                            size="sm"
                            variant="quiet"
                            icon={<AppIcon name="audio" size={22} />}
                            label={`Play ${number}`}
                            className="-mt-0.5 shrink-0 text-brand-primary hover:text-brand-primary hover:brightness-90"
                          />
                          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-2">
                            {chunks.map((chunk, chunkIndex) => chunk.length > 0 && (
                              <div key={chunkIndex} className="flex flex-col">
                                <div className="flex">
                                  {chunk.map((unit, unitIndex) => (
                                    <span key={unitIndex} className="flex flex-col items-center px-0.5">
                                      <span
                                        className={cn(
                                          'font-chinese text-2xl font-black leading-tight',
                                          BLOCK_TOKENS[chunkIndex].ink,
                                          unit.optional && 'opacity-50',
                                        )}
                                      >
                                        {unit.optional ? `（${unit.char}）` : unit.char}
                                      </span>
                                      {showPinyin && (
                                        <span className="mt-0.5 whitespace-nowrap text-[11px] font-extrabold leading-none text-ui-muted-strong sm:text-xs">
                                          {unit.optional ? `(${unit.pinyin})` : unit.pinyin}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                                <span className={cn('mt-1.5 h-1 rounded-full', BLOCK_TOKENS[chunkIndex].bar)} />
                              </div>
                            ))}
                            <span className="ml-auto pb-1 text-sm font-black tabular-nums text-ui-muted-strong">{number}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <p className="bg-ui-surface px-4 pb-3 pt-2 text-xs font-bold text-ui-muted">Tap a row to see how it is read.</p>
      </div>
    </section>
  );
}
