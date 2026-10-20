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

/** "2 days later" / "10 min later": the gap is what 快要……了 is about. */
function gapLabel(now: PracticeMoment, next: PracticeMoment) {
  if (now.date && next.date && now.date.month === next.date.month) {
    const days = next.date.day - now.date.day;
    return days > 0 ? `${days} day${days === 1 ? '' : 's'} later` : null;
  }
  if (now.time && next.time) {
    const minutes = minutesOf(next.time) - minutesOf(now.time);
    return minutes > 0 ? `${minutes} min later` : null;
  }
  return null;
}

export function CalendarFace({ month, day, next }: { month: number; day: number; next: boolean }) {
  return (
    <div className="flex w-24 flex-col overflow-hidden rounded-control bg-ui-hover sm:w-28">
      <span className={`py-1 text-center text-xs font-bold ${next ? 'bg-brand-primary text-brand-on-primary' : 'bg-ui-divider text-ui-muted-strong'}`}>
        <span className="font-chinese">{month}月</span>
      </span>
      <span className={`py-2 text-center text-4xl font-black tabular-nums sm:text-5xl ${next ? 'text-brand-primary' : 'text-ui-muted-strong'}`}>{day}</span>
    </div>
  );
}

export function ClockFace({ time, next }: { time: string; next: boolean }) {
  const total = minutesOf(time);
  const minuteAngle = (total % 60) * 6;
  const hourAngle = ((total / 60) % 12) * 30;
  return (
    <svg viewBox="0 0 100 100" className={`size-24 sm:size-28 ${next ? 'text-brand-primary' : 'text-ui-muted-strong'}`} aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
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
    <div className="flex min-w-24 flex-col items-center gap-2 sm:min-w-28">
      {moment.date && <CalendarFace month={moment.date.month} day={moment.date.day} next={next} />}
      {moment.time && <ClockFace time={moment.time} next={next} />}
      {moment.label ? (
        <span className="flex flex-col items-center text-center leading-tight">
          <span className="font-chinese text-base text-ui-ink-strong">{renderChinese(moment.label)}</span>
          <span className="text-xs text-ui-muted">{moment.label.english}</span>
        </span>
      ) : (
        <span className="h-9" aria-hidden="true" />
      )}
    </div>
  );
}

/** The book's now → soon picture (calendar days or clock times) for 快（要）/要……了. */
export function CountdownScene({ now, next, renderChinese }: CountdownSceneProps) {
  const gap = gapLabel(now, next);
  const describe = (moment: PracticeMoment) => [
    moment.label?.english,
    moment.date && `${moment.date.month}/${moment.date.day}`,
    moment.time,
  ].filter(Boolean).join(' ');
  return (
    <div
      role="img"
      aria-label={`${describe(now)}, then ${describe(next)}`}
      className="flex items-start justify-center gap-2 px-3 py-6 sm:gap-6 sm:px-4"
    >
      <Moment moment={now} next={false} renderChinese={renderChinese} />
      <div className="flex flex-col items-center gap-1 self-center pb-9 text-ui-muted">
        <AppIcon name="forward" size={24} className="shrink-0" />
        {gap && <span className="whitespace-nowrap text-xs">{gap}</span>}
      </div>
      <Moment moment={next} next renderChinese={renderChinese} />
    </div>
  );
}
