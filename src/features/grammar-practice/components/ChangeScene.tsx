import type { ReactNode } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { CalendarFace } from './CountdownScene';

interface ChangeSceneProps {
  before: { label: string; value: string; date?: { month: number; day: number } };
  now: { label: string; value: string; date?: { month: number; day: number } };
  children?: ReactNode;
  alt?: string;
}

/** The book's before → now picture (e.g. 25°C → 30°C): what changed is what 了 marks. */
export function ChangeScene({ before, now, children, alt }: ChangeSceneProps) {
  const describe = (moment: ChangeSceneProps['before']) => [moment.date && `${moment.date.month}/${moment.date.day}`, moment.label, moment.value].filter(Boolean).join(' ');
  return (
    <div
      role="img"
      aria-label={alt ?? `${describe(before)}, then ${describe(now)}`}
      className="flex flex-col items-center gap-3 py-5"
    >
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        {[before, now].map((moment, index) => (
          <div key={index} className="contents">
            {index === 1 && <AppIcon name="forward" size={24} className="shrink-0 text-ui-muted" />}
            <div className="flex min-w-28 flex-col items-center gap-2 text-center sm:min-w-32">
              {moment.date && <CalendarFace {...moment.date} next={index === 1} />}
              <span className="font-chinese font-semibold text-sm text-ui-ink sm:text-base">{moment.label}</span>
              <span className="text-3xl font-black tabular-nums text-ui-ink-strong sm:text-4xl">{moment.value}</span>
            </div>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
