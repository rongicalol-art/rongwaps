import { useEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon, PlayfulNavIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { ActivityRing } from './ActivityRing';
import { ModeIcon } from './ModeIcon';
import { isModeAvailable, type LessonWindowPart, type PartModeKey } from './useLessonWindowParts';

const MODES: Array<{ key: PartModeKey; name: string }> = [
  { key: 'vocab', name: 'Vocabulary' },
  { key: 'grammar', name: 'Grammar' },
  { key: 'reading', name: 'Reading' },
];

const DIVIDER_EDGE = 'var(--color-ui-divider)';

/** How far the part's activity is, 0–1 (reading counts once it was read to the end). */
function getModeFraction(part: LessonWindowPart, mode: PartModeKey): number {
  if (mode === 'vocab') return part.vocab.total > 0 ? part.vocab.done / part.vocab.total : 1;
  if (mode === 'grammar') return part.grammar && part.grammar.total > 0 ? part.grammar.done / part.grammar.total : 1;
  return part.isReadingRead ? 1 : 0;
}

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
            <ActivityRing fraction={getModeFraction(part, key)} label={name} />
          </ActionButton>
        );
      })}
    </div>
  );
}

interface LessonActionsProps {
  onStart: () => void;
  /** The start button's label (the Test tab says "Start mock test"). */
  label?: string;
  onStartIntent: () => void;
  onOpenPracticeHub?: () => void;
  isPracticeHubOpen?: boolean;
  className?: string;
}

/** Start the selected lesson mode; Practice sits quietly underneath so Start owns the full primary row. */
export function LessonActions({
  onStart,
  label = 'Start',
  onStartIntent,
  onOpenPracticeHub,
  isPracticeHubOpen,
  className,
}: LessonActionsProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <ActionButton
        size="lg"
        fullWidth
        className="whitespace-nowrap text-lg tracking-normal"
        onClick={onStart}
        onPointerEnter={onStartIntent}
        onPointerDown={onStartIntent}
        onFocus={onStartIntent}
      >
        <AppIcon name="play" size={20} />
        <span>{label}</span>
      </ActionButton>
      {onOpenPracticeHub && (
        <ActionButton
          variant="quiet"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={isPracticeHubOpen}
          onClick={onOpenPracticeHub}
          className="mt-0.5 gap-1.5 text-sm normal-case tracking-normal"
        >
          <PlayfulNavIcon name="practiceHub" className="h-5 w-5" />
          <span>Practice</span>
          <AppIcon name="next" size={14} className="opacity-70" />
        </ActionButton>
      )}
    </div>
  );
}
