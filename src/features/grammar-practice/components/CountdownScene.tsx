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

/** Scene art palette: "now" in the book's blue, "next" in the warm accent; every object stands on a solid darker edge. */
const tone = (next: boolean) => (next
  ? { body: 'fill-brand-secondary', edge: 'fill-brand-secondary-edge' }
  : { body: 'fill-brand-primary', edge: 'fill-brand-primary-edge' });

export function CalendarFace({ month, day, next }: { month: number; day: number; next: boolean }) {
  const { body, edge } = tone(next);
  return (
    <svg viewBox="0 0 120 124" className="h-32 w-auto sm:h-36" aria-hidden="true">
      <rect x="8" y="22" width="104" height="98" rx="16" className="fill-ui-border" />
      <rect x="8" y="16" width="104" height="98" rx="16" className="fill-ui-surface" />
      <path d="M8 32a16 16 0 0 1 16-16h72a16 16 0 0 1 16 16v14H8z" className={body} />
      <rect x="8" y="46" width="104" height="4" className={edge} />
      <rect x="31" y="6" width="9" height="22" rx="4.5" className="fill-ui-ink-strong" />
      <rect x="80" y="6" width="9" height="22" rx="4.5" className="fill-ui-ink-strong" />
      <text x="60" y="41" textAnchor="middle" className="fill-brand-on-primary font-chinese text-[17px] font-bold">{month}月</text>
      <text x="60" y="98" textAnchor="middle" className="fill-ui-ink-strong font-sans text-[46px] font-black tabular-nums">{day}</text>
    </svg>
  );
}

/** An alarm clock: two bells, a thick rim on its own darker edge, chunky hands and a warm centre cap. */
export function ClockFace({ time, next }: { time: string; next: boolean }) {
  const total = minutesOf(time);
  const minuteAngle = (total % 60) * 6;
  const hourAngle = ((total / 60) % 12) * 30;
  const { body, edge } = tone(next);
  const bell = (x: number, turn: number) => (
    <g transform={`translate(${x} 24) rotate(${turn})`}>
      <path d="M-15 4a15 15 0 0 1 30 0z" className={edge} />
      <path d="M-15 0a15 15 0 0 1 30 0z" className={body} />
      <circle cy="-16" r="3.5" className={edge} />
    </g>
  );
  return (
    <svg viewBox="0 0 120 124" className="h-32 w-auto sm:h-36" aria-hidden="true">
      {bell(26, -38)}
      {bell(94, 38)}
      <rect x="26" y="98" width="10" height="20" rx="5" transform="rotate(32 31 108)" className={edge} />
      <rect x="84" y="98" width="10" height="20" rx="5" transform="rotate(-32 89 108)" className={edge} />
      <circle cx="60" cy="69" r="48" className={edge} />
      <circle cx="60" cy="64" r="48" className={body} />
      <path d="M19.6 49.3A43 43 0 0 1 41.8 25" className="fill-none stroke-brand-on-primary opacity-40 [stroke-linecap:round] [stroke-width:4]" />
      <circle cx="60" cy="64" r="38" className="fill-ui-surface" />
      {Array.from({ length: 12 }, (_, tick) => (tick % 3 === 0
        ? <rect key={tick} x="57.5" y="30" width="5" height="9" rx="2.5" transform={`rotate(${tick * 30} 60 64)`} className="fill-ui-ink-strong" />
        : <circle key={tick} cx="60" cy="33" r="2.2" transform={`rotate(${tick * 30} 60 64)`} className="fill-ui-border" />))}
      <rect x="56.5" y="44" width="7" height="24" rx="3.5" transform={`rotate(${hourAngle} 60 64)`} className="fill-ui-ink-strong" />
      <rect x="57.75" y="34" width="4.5" height="34" rx="2.25" transform={`rotate(${minuteAngle} 60 64)`} className="fill-ui-ink" />
      <circle cx="60" cy="64" r="6.5" className="fill-brand-secondary" />
      <circle cx="60" cy="64" r="2.5" className="fill-ui-surface" />
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
