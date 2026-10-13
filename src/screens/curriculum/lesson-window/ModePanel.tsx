import { ActionButton, AppIcon, PlayfulNavIcon, type PlayfulNavIconName } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { isModeAvailable, type LessonWindowPart, type PartModeKey } from './useLessonWindowParts';

const MODES: Array<{ key: PartModeKey; name: string; icon: PlayfulNavIconName }> = [
  { key: 'vocab', name: 'Vocabulary', icon: 'flashcards' },
  { key: 'grammar', name: 'Grammar', icon: 'grammarBook' },
  { key: 'reading', name: 'Reading', icon: 'reading' },
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
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {MODES.filter(({ key }) => isModeAvailable(part, key)).map(({ key, name, icon }) => {
        const isSelected = key === selected;
        const status = isSelected ? getModeStatus(part, key) : '';
        return (
          <ActionButton
            key={key}
            variant="secondary"
            size="lg"
            fullWidth
            aria-pressed={isSelected}
            onClick={() => onSelect(key)}
            edgeColor={isSelected ? 'var(--color-brand-primary-edge)' : DIVIDER_EDGE}
            className={cn(
              'justify-start gap-3 px-3 py-2.5 text-left normal-case tracking-normal',
              large && 'gap-3.5 px-4 py-3.5',
              isSelected
                ? '!border-brand-primary !bg-brand-primary-soft hover:!bg-brand-primary-soft'
                : '!border-ui-divider',
            )}
          >
            <PlayfulNavIcon name={icon} className={large ? 'h-12 w-12' : 'h-9 w-9'} />
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
  canQuiz: boolean;
  onStart: () => void;
  onQuiz: () => void;
  className?: string;
}

/** Start the selected mode, or quiz the part. */
export function LessonActions({ canQuiz, onStart, onQuiz, className }: LessonActionsProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {canQuiz && (
        <ActionButton
          variant="secondary"
          size="lg"
          edgeColor={DIVIDER_EDGE}
          className="!border-ui-divider !text-ui-muted-strong"
          onClick={onQuiz}
        >
          <AppIcon name="quizMark" size={22} className="text-ui-muted" />
          <span>Quiz</span>
        </ActionButton>
      )}
      <div className="min-w-0 flex-1">
        <ActionButton size="lg" fullWidth className="whitespace-nowrap" onClick={onStart}>
          <AppIcon name="play" size={20} />
          <span>Start</span>
        </ActionButton>
      </div>
    </div>
  );
}
