import type { ReadingItem, TestText } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { ChineseText } from './ChineseText';
import type { Script } from './ChoiceList';
import { testRubyItems } from '../testPinyin';
import { PinyinText, RubyRun } from './PinyinText';

const text = (value: Pick<TestText, 'traditional' | 'simplified'> | undefined, script: Script) => (value ? value[script] ?? value.traditional : '');

/** A notice line like 時間：十一月每個星期六 splits into its label and value. */
const LABELLED = /^(.{1,6})：(.+)$/;

/** A notice's label and value, each with its pinyin over it when shown (the line's ruby splits at the colon). */
function LabelledLine({ label, value, line, pinyin }: { label: string; value: string; line: string; pinyin?: string }) {
  const items = pinyin ? testRubyItems(line, pinyin) : null;
  const cut = label.length + 1;
  return (
    <div>
      <p className={cn('flex gap-3 font-chinese text-lg text-ui-ink-strong', items ? 'leading-[1.9]' : 'leading-7')}>
        <span className="shrink-0 text-ui-muted-strong">{items ? <RubyRun items={items.slice(0, label.length)} /> : label}</span>
        <span>{items ? <RubyRun items={items.slice(cut)} /> : <ChineseText text={value} />}</span>
      </p>
      {/* Pinyin that doesn't fit the characters (numbers spelled out) reads on its own line. */}
      {pinyin && !items && <p className="font-sans text-[15px] font-bold leading-snug text-ui-muted-strong">{pinyin}</p>}
    </div>
  );
}

/**
 * A note, notice, timetable or passage, drawn by the app as a printed card (its writing is exact, and it follows
 * dark mode). Notices and timetables carry their title on a tinted band; a message's last line signs it. The
 * booklet can show its pinyin over the characters (`pinyin`; tables keep their cells plain).
 */
export function ReadingText({ item, script, pinyin = false }: { item: ReadingItem; script: Script; pinyin?: boolean }) {
  const lines = text(item.text, script).split('\n');
  const readings = pinyin ? item.text.pinyin.split('\n') : [];
  const title = item.title && text(item.title, script);
  const titleText = title && <PinyinText text={title} pinyin={item.title?.pinyin} show={pinyin} />;
  if (item.format === 'table' || item.format === 'notice') {
    const [head = [], ...rows] = item.format === 'table' ? lines.map((line) => line.split('｜')) : [];
    return (
      <div className="w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-surface">
        {title && <p className={cn('text-balance bg-brand-primary-wash px-5 py-3 text-center font-chinese text-xl text-ui-ink-strong', pinyin && 'leading-[1.9]')}>{titleText}</p>}
        {item.format === 'table' ? (
          // Phones: smaller type and margins so five columns keep their headers and titles on one or two lines.
          <table className="mx-3 my-3 w-[calc(100%-1.5rem)] border-collapse font-chinese text-base text-ui-ink-strong sm:mx-5 sm:w-[calc(100%-2.5rem)] sm:text-lg">
            <thead>
              <tr>{head.map((cell, index) => <th key={index} scope="col" className="border-b-2 border-ui-divider px-1 pb-2 text-left text-sm font-normal text-ui-muted-strong sm:px-1.5 sm:text-base"><ChineseText text={cell} /></th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b-2 border-ui-divider last:border-b-0">
                  {row.map((cell, column) => <td key={column} className="px-1 py-2 tabular-nums sm:px-1.5"><ChineseText text={cell} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col gap-2 px-5 py-4">
            {lines.map((line, index) => {
              const labelled = LABELLED.exec(line);
              const signature = index === lines.length - 1 && !labelled && lines.length > 2;
              return labelled ? (
                <LabelledLine key={index} label={labelled[1]} value={labelled[2]} line={line} pinyin={readings[index]} />
              ) : (
                <p key={index} className={cn('font-chinese text-lg leading-8 text-ui-ink-strong', pinyin && 'leading-[1.9]', signature && 'text-right text-base text-ui-muted-strong')}>
                  <PinyinText text={line} pinyin={readings[index]} show={pinyin} />
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-5 py-4">
      {title && <p className={cn('mb-2 text-balance text-center font-chinese text-xl text-ui-ink-strong', pinyin && 'leading-[1.9]')}>{titleText}</p>}
      {lines.map((line, index) => (
        <p
          key={index}
          className={cn(
            'font-chinese text-lg leading-8 text-ui-ink-strong md:text-xl',
            pinyin && 'leading-[2.1] md:leading-[2.1]',
            // A passage's paragraphs start two characters in, as printed Chinese does.
            item.format === 'passage' && 'indent-[2em]',
            item.format === 'message' && index === lines.length - 1 && lines.length > 2 && 'text-right text-ui-muted-strong',
          )}
        >
          <PinyinText text={line} pinyin={readings[index]} show={pinyin} />
        </p>
      ))}
    </div>
  );
}
