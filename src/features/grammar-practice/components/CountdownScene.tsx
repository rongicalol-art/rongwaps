import type { ReactNode } from 'react';
import type { PracticeMoment, PracticeText } from '../../../types/models';
import { AppIcon } from '../../../lib/widgets';

interface CountdownSceneProps {
  now: PracticeMoment;
  next: PracticeMoment;
  renderChinese: (text: PracticeText) => ReactNode;
}

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function CalendarFace({ month, day, next }: { month: number; day: number; next: boolean }) {
  return (
    <div className="flex w-28 flex-col overflow-hidden rounded-control border-2 border-ui-border bg-ui-surface sm:w-32">
      <span className="bg-brand-primary-wash py-2 text-center text-sm font-extrabold text-ui-ink">
        <span className="font-chinese">{month}月</span>
      </span>
      <span className={`py-2 text-center text-5xl font-black tabular-nums sm:text-6xl ${next ? 'text-ui-ink-strong' : 'text-ui-ink'}`}>{day}</span>
    </div>
  );
}

export function ClockFace({ time, next }: { time: string; next: boolean }) {
  const total = minutesOf(time);
  const minuteAngle = (total % 60) * 6;
  const hourAngle = ((total / 60) % 12) * 30;
  return (
    <svg viewBox="0 0 100 100" className={`size-28 sm:size-32 ${next ? 'text-ui-ink-strong' : 'text-ui-ink'}`} aria-hidden="true">
      <circle cx="50" cy="50" r="45" className="fill-ui-surface" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, tick) => (
        <line key={tick} x1="50" y1="9" x2="50" y2={tick % 3 === 0 ? 17 : 14} stroke="currentColor" strokeWidth={tick % 3 === 0 ? 3 : 2} strokeLinecap="round" transform={`rotate(${tick * 30} 50 50)`} />
      ))}
      <line x1="50" y1="50" x2="50" y2="28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

export function Moment({ moment, next, renderChinese }: { moment: PracticeMoment; next: boolean; renderChinese: CountdownSceneProps['renderChinese'] }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3">
      {moment.date && <CalendarFace month={moment.date.month} day={moment.date.day} next={next} />}
      {moment.time && <ClockFace time={moment.time} next={next} />}
      {moment.label ? (
        <span className="flex flex-col items-center text-center leading-tight">
          <span className="font-chinese text-sm text-ui-ink-strong sm:text-base">{renderChinese(moment.label)}</span>
        </span>
      ) : (
        <span className="h-9" aria-hidden="true" />
      )}
    </div>
  );
}

/** The book's now → soon picture (calendar days or clock times) for 快（要）/要……了. */
export function CountdownScene({ now, next, renderChinese }: CountdownSceneProps) {
  const describe = (moment: PracticeMoment) => [
    moment.label?.english,
    moment.date && `${moment.date.month}/${moment.date.day}`,
    moment.time,
  ].filter(Boolean).join(' ');
  return (
    <div
      role="img"
      aria-label={`${describe(now)}, then ${describe(next)}`}
      className="flex items-start justify-center gap-3 py-5 sm:gap-6"
    >
      <Moment moment={now} next={false} renderChinese={renderChinese} />
      <div className="flex flex-col items-center gap-1 self-center pb-9 text-ui-muted">
        <AppIcon name="forward" size={24} className="shrink-0" />
      </div>
      <Moment moment={next} next renderChinese={renderChinese} />
    </div>
  );
}
