import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { ModeIcon } from './ModeIcon';
import { isModeAvailable, type LessonWindowPart, type PartModeKey } from './useLessonWindowParts';

const MODES: Array<{ key: PartModeKey; name: string }> = [
  { key: 'vocab', name: 'Vocabulary' },
  { key: 'grammar', name: 'Grammar' },
  { key: 'reading', name: 'Reading' },
];

const DIVIDER_EDGE = 'var(--color-ui-divider)';

function getModeStatus(part: LessonWindowPart, mode: PartModeKey): string {
  if (mode === 'vocab') {
    const { done, total } = part.vocab;
    return done >= total ? `${total} words` : `${done} of ${total} words`;
  }
  if (mode === 'grammar') return part.grammar?.label ?? '';
  return part.readingLabel;
}

interface ModeButtonsProps {
  part: LessonWindowPart;
  selected: PartModeKey;
  onSelect: (mode: PartModeKey) => void;
  /** Desktop sizing: 48px icon, 18px name. */
  large?: boolean;
  className?: string;
}

/** Vocab / Grammar / Reading: pick what "Start" launches. */
export function ModeButtons({ part, selected, onSelect, large = false, className }: ModeButtonsProps) {
  // Each icon plays on entrance (staggered), then again on hover or selection; never while it is still playing.
  const [plays, setPlays] = useState<Record<string, number>>({});
  const lastPlay = useRef<Record<string, number>>({});
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  const replay = (key: string) => {
    const now = Date.now();
    if (now - (lastPlay.current[key] ?? 0) < 900) return;
    lastPlay.current[key] = now;
    setPlays((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }));
  };
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {MODES.filter(({ key }) => isModeAvailable(part, key)).map(({ key, name }, index) => {
        const isSelected = key === selected;
        const status = isSelected ? getModeStatus(part, key) : '';
        return (
          <ActionButton
            key={key}
            variant="secondary"
            size="lg"
            fullWidth
            aria-pressed={isSelected}
            onClick={() => { onSelect(key); replay(key); }}
            onPointerEnter={() => replay(key)}
            edgeColor={isSelected ? 'var(--color-brand-primary)' : DIVIDER_EDGE}
            className={cn(
              'justify-start gap-3 px-3 py-2.5 text-left normal-case tracking-normal !transition-transform',
              large && 'gap-3.5 px-4 py-3.5',
              isSelected
                ? '!border-brand-primary !bg-brand-primary-soft hover:!bg-brand-primary-soft'
                : '!border-ui-divider',
            )}
          >
            <ModeIcon mode={key} playKey={plays[key] ?? 0} motion={isSelected ? 'loop' : plays[key] || !entered ? 'once' : 'none'} delay={plays[key] ? 0 : 0.12 + index * 0.07} className={large ? 'h-12 w-12' : 'h-9 w-9'} />
            <span className="flex min-w-0 flex-1 flex-col justify-center">
              <span className={cn('font-black text-ui-ink-strong leading-tight', large ? 'text-lg' : 'text-[17px]')}>
                {name}
              </span>
              {status ? (
                <span className="truncate text-xs font-bold text-ui-muted mt-0.5">
                  {status}
                </span>
              ) : null}
            </span>
          </ActionButton>
        );
      })}
    </div>
  );
}

interface LessonActionsProps {
  onStart: () => void;
  onStartIntent: () => void;
  className?: string;
}

/** Start the selected lesson mode. Quiz lives in Practice hub. */
export function LessonActions({ onStart, onStartIntent, className }: LessonActionsProps) {
  return (
    <ActionButton
      size="lg"
      fullWidth
      className={cn('whitespace-nowrap', className)}
      onClick={onStart}
      onPointerEnter={onStartIntent}
      onPointerDown={onStartIntent}
      onFocus={onStartIntent}
    >
      <span>Start</span>
    </ActionButton>
  );
}
