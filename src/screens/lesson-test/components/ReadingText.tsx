import { useState } from 'react';
import type { ReadingItem, TestText } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { ChineseText } from './ChineseText';
import type { Script } from './ChoiceList';
import { testRubyItems } from '../testPinyin';
import { PinyinText, RubyRun } from './PinyinText';

const text = (value: Pick<TestText, 'traditional' | 'simplified'> | undefined, script: Script) => (value ? value[script] ?? value.traditional : '');

/** A notice line like 時間：十一月每個星期六 splits into its label and value. */
const LABELLED = /^(.{1,6})：(.+)$/;
/** A notice's numbered rule (一、出去的時候……) hangs on its number. */
const NUMBERED = /^([一二三四五六七八九十]{1,2}、)(.+)$/;

/** The sheet every reading is printed on: flat, because depth means "press me" and only the answers are pressed. */
const CARD = 'w-full overflow-hidden rounded-feature border-2';
const LINE = 'font-chinese text-lg text-ui-ink-strong md:text-xl';
/** A sign-off (中山路店 11月15日): the last line, short and not a sentence (歡迎帶朋友一起來參加！ is still the notice talking). */
const signs = (lines: string[], index: number) => index === lines.length - 1 && lines.length > 2 && !/[。！？!?]$/.test(lines[index]);

/** A line cut after its head (a label or a number), each part with its pinyin over it when shown. */
function splitLine({ head, rest, line, pinyin }: { head: string; rest: string; line: string; pinyin?: string }) {
  const items = pinyin ? testRubyItems(line, pinyin) : null;
  return [
    items ? <RubyRun key="head" items={items.slice(0, head.length)} /> : head,
    <span key="rest" className="min-w-0">
      {/* min-w-0: Safari sizes a run of looked-up words as one unbreakable piece, so the value wouldn't wrap. */}
      {items ? <RubyRun items={items.slice(head.length + (line.startsWith(`${head}：`) ? 1 : 0))} /> : <ChineseText text={rest} />}
      {/* Pinyin that doesn't fit the characters (numbers spelled out) reads on its own line. */}
      {pinyin && !items && <span className="block font-sans text-[15px] font-bold leading-snug text-ui-muted-strong">{pinyin}</span>}
    </span>,
  ] as const;
}

interface Row { head: string; rest: string; line: string; index: number }
type Block =
  | { type: 'facts'; rows: Row[] }
  | { type: 'list'; rows: Row[] }
  | { type: 'text' | 'sign'; line: string; index: number };

/** A notice's lines, grouped the way a printed notice is: plain lines, one ruled block of facts, a numbered list, the signature. */
function noticeBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  lines.forEach((line, index) => {
    const fact = LABELLED.exec(line);
    const numbered = fact ? null : NUMBERED.exec(line);
    const match = fact ?? numbered;
    const type = fact ? 'facts' : 'list';
    const last = blocks[blocks.length - 1];
    if (match) {
      const row = { head: match[1], rest: match[2], line, index };
      if (last && last.type === type && 'rows' in last) last.rows.push(row);
      else blocks.push({ type, rows: [row] });
    } else {
      blocks.push({ type: signs(lines, index) ? 'sign' : 'text', line, index });
    }
  });
  return blocks;
}

/**
 * A note, notice, timetable or passage, drawn by the app as the real thing it is (its writing is exact, and it
 * follows dark mode): a notice is a poster with a large printed headline, its facts (時間, 地方…) in one ruled
 * block and its sender signing it; a timetable has a tinted header row; a message is a note on warm paper,
 * signed by its writer; a passage is a reader page. The booklet can show its pinyin over the characters
 * (`pinyin`; tables keep their cells plain). `markable`: a tap marks a table row, like running a finger along it.
 */
export function ReadingText({ item, script, pinyin = false, markable = false }: { item: ReadingItem; script: Script; pinyin?: boolean; markable?: boolean }) {
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());
  const lines = text(item.text, script).split('\n');
  const readings = pinyin ? item.text.pinyin.split('\n') : [];
  const leading = pinyin ? 'leading-[1.9]' : 'leading-relaxed';
  const title = item.title && text(item.title, script);
  // A printed headline: large ink type carries it, no coloured band.
  const band = title && (
    <p className={cn('text-balance px-5 pb-1 pt-5 text-center font-chinese text-2xl leading-snug tracking-[0.04em] text-ui-ink-strong md:text-[1.75rem]', pinyin && 'leading-[1.9] tracking-normal')}>
      <PinyinText text={title} pinyin={item.title?.pinyin} show={pinyin} />
    </p>
  );

  if (item.format === 'table') {
    const [head = [], ...rows] = lines.map((line) => line.split('｜'));
    const mark = (index: number) => setMarked((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
    return (
      <div className={cn(CARD, 'border-ui-border bg-ui-surface')}>
        {band}
        {/* Phones: smaller type and padding so five columns keep their headers and titles on one or two lines; the
            narrowest phones (320 wide) tighten the cells further. */}
        <table className={cn('w-full border-collapse font-chinese text-base text-ui-ink-strong sm:text-lg', title && 'mt-4')}>
          <thead>
            <tr className="bg-brand-primary-wash">
              {head.map((cell, index) => (
                <th key={index} scope="col" className="px-2 py-2.5 text-left text-sm font-normal text-brand-primary-text first:pl-4 last:pr-4 max-[359px]:px-1 sm:px-3.5 sm:text-base sm:first:pl-5 sm:last:pr-5">
                  <ChineseText text={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                onClick={markable ? () => mark(index) : undefined}
                className={cn(markable && 'cursor-pointer', marked.has(index) ? 'bg-brand-primary-wash' : markable && 'hover:bg-ui-hover')}
              >
                {row.map((cell, column) => (
                  <td
                    key={column}
                    className={cn(
                      'border-t-2 border-ui-divider px-2 py-3 tabular-nums first:pl-4 last:pr-4 max-[359px]:px-1 sm:px-3.5 sm:first:pl-5 sm:last:pr-5',
                      column === 0 && marked.has(index) && 'shadow-[inset_4px_0_0_var(--color-brand-primary)]',
                    )}
                  >
                    <ChineseText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (item.format === 'notice') {
    return (
      <div className={cn(CARD, 'border-ui-border bg-ui-surface')}>
        {band}
        <div className="flex flex-col gap-3.5 px-5 pb-4 pt-5 md:px-6">
          {noticeBlocks(lines).map((block) => {
            if (block.type === 'facts') {
              return (
                <div key={block.rows[0].index} className={cn('grid grid-cols-[auto_1fr] border-y-2 border-ui-divider', LINE, leading)}>
                  {block.rows.map((row, at) => {
                    const [label, value] = splitLine({ ...row, pinyin: readings[row.index] });
                    const rule = at > 0 && 'border-t-2 border-ui-divider';
                    return [
                      <span key={`${row.index}k`} className={cn('whitespace-nowrap py-2.5 pr-4 text-brand-primary-text', rule)}>{label}</span>,
                      <span key={`${row.index}v`} className={cn('py-2.5', rule)}>{value}</span>,
                    ];
                  })}
                </div>
              );
            }
            if (block.type === 'list') {
              return (
                <div key={block.rows[0].index} className="flex flex-col gap-2">
                  {block.rows.map((row) => {
                    const [number, rest] = splitLine({ ...row, pinyin: readings[row.index] });
                    return (
                      <p key={row.index} className={cn('flex gap-1.5', LINE, leading)}>
                        <span className="shrink-0 text-brand-primary-text">{number}</span>
                        {rest}
                      </p>
                    );
                  })}
                </div>
              );
            }
            return (
              <p key={block.index} className={cn(LINE, leading, block.type === 'sign' && 'text-right text-base text-ui-muted-strong md:text-lg')}>
                <PinyinText text={block.line} pinyin={readings[block.index]} show={pinyin} />
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  if (item.format === 'message') {
    // A note: who it's for on top (友美：), the body, and the writer's name signing it.
    const to = lines.length > 1 && /[：:]$/.test(lines[0]) ? 0 : -1;
    const from = signs(lines, lines.length - 1) ? lines.length - 1 : -1;
    return (
      <div className={cn(CARD, 'flex flex-col gap-3 border-brand-primary-soft-edge bg-brand-primary-soft px-5 pb-5 pt-5 md:px-6')}>
        {lines.map((line, index) => (
          <p
            key={index}
            className={cn(
              LINE,
              leading,
              index === to && 'border-b-2 border-brand-primary-soft-edge pb-2.5 text-xl',
              index === from && 'text-right text-ui-ink',
            )}
          >
            <PinyinText text={line} pinyin={readings[index]} show={pinyin} />
          </p>
        ))}
      </div>
    );
  }

  // A passage: a reader page, larger type with room between lines, paragraphs two characters in as printed Chinese.
  return (
    <div className={cn(CARD, 'flex flex-col gap-3 border-ui-border bg-ui-surface px-5 py-5 md:px-7 md:py-6')}>
      {title && <p className={cn('text-balance text-center font-chinese text-xl text-ui-ink-strong', pinyin && 'leading-[1.9]')}><PinyinText text={title} pinyin={item.title?.pinyin} show={pinyin} /></p>}
      {lines.map((line, index) => (
        <p key={index} className={cn('indent-[2em] font-chinese text-lg leading-9 text-ui-ink-strong md:text-xl md:leading-10', pinyin && 'leading-[2.1] md:leading-[2.1]')}>
          <PinyinText text={line} pinyin={readings[index]} show={pinyin} />
        </p>
      ))}
    </div>
  );
}
