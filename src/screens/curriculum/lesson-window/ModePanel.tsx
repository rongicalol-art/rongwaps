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

function isModeDone(part: LessonWindowPart, mode: PartModeKey): boolean {
  if (mode === 'vocab') return part.vocab.total > 0 && part.vocab.done >= part.vocab.total;
  if (mode === 'grammar') return Boolean(part.grammar && part.grammar.done >= part.grammar.total);
  return false;
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
              'justify-start gap-3 px-3 py-2.5 text-left',
              large && 'gap-3.5 px-4 py-3.5',
              isSelected
                ? '!border-brand-primary !bg-brand-primary-soft hover:!bg-brand-primary-soft'
                : '!border-ui-divider',
            )}
          >
            <PlayfulNavIcon name={icon} className={large ? 'h-12 w-12' : 'h-9 w-9'} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn('font-black text-ui-ink-strong', large ? 'text-lg' : 'text-[17px]')}>{name}</span>
              <span className="truncate text-sm font-bold text-ui-muted">{getModeStatus(part, key)}</span>
            </span>
            {isModeDone(part, key) && (
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-brand-primary text-white" role="img" aria-label="Done">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
                </svg>
              </span>
            )}
          </ActionButton>
        );
      })}
    </div>
  );
}

interface LessonActionsProps {
  mode: PartModeKey;
  canQuiz: boolean;
  onStart: () => void;
  onQuiz: () => void;
  className?: string;
}

/** Start the selected mode, or quiz the part. */
export function LessonActions({ mode, canQuiz, onStart, onQuiz, className }: LessonActionsProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {canQuiz && (
        <ActionButton
          variant="secondary"
          size="lg"
          edgeColor={DIVIDER_EDGE}
          className="!border-ui-divider text-[17px]"
          onClick={onQuiz}
        >
          <AppIcon name="quizMark" size={22} className="text-ui-muted" />
          <span>Quiz</span>
        </ActionButton>
      )}
      <div className="min-w-0 flex-1">
        <ActionButton size="lg" fullWidth className="whitespace-nowrap text-[17px]" onClick={onStart}>
          <AppIcon name="play" size={20} />
          <span>Start {mode === 'vocab' ? 'vocabulary' : mode}</span>
        </ActionButton>
      </div>
    </div>
  );
}
