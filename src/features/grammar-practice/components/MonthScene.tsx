import type { ReactNode } from 'react';
import type { PracticeText } from '../../../types/models';

interface MonthSceneProps {
  year: number;
  month: number;
  highlight: number[];
  renderChinese: (text: PracticeText) => ReactNode;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** The book's month calendar: real weekday for day 1, highlighted days in brand colour. */
export function MonthScene({ year, month, highlight, renderChinese }: MonthSceneProps) {
  const blanks = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  return (
    <div
      role="img"
      aria-label={`${year}/${month}, highlighted days ${highlight.join(', ')}`}
      className="mx-auto w-full max-w-sm rounded-feature border-2 border-ui-divider bg-ui-surface px-3 py-4 sm:px-5"
    >
      <p className="mb-2 text-center text-sm font-bold text-ui-muted-strong">
        {renderChinese({ traditional: `${year}年${month}月` })}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center tabular-nums">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="font-chinese text-xs text-ui-muted">{weekday}</span>
        ))}
        {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          return (
            <span
              key={day}
              className={highlight.includes(day)
                ? 'mx-auto grid size-8 place-items-center rounded-control bg-brand-primary text-sm font-black text-brand-on-primary'
                : 'mx-auto grid size-8 place-items-center text-sm text-ui-muted-strong'}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
