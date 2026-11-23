import { ActionButton, AppIcon, PlayfulNavIcon } from '../../../lib/widgets';
import type { LessonTestLesson, LessonTestMode } from '../../../types/lessonTest';
import { lessonTestBestForMode, type LessonTestRecord } from '../../../store/slices/lessonTestSlice';
import { cn } from '../../../utils/cn';
import { isLessonTestPassed } from '../../../utils/lesson/lessonCompletion';
import {
  LESSON_TEST_PASS,
  lessonTestHasBothParts,
  lessonTestQuestionCount,
} from '../../../utils/lesson/lessonTestPlan';
import { ActivityRing } from './ActivityRing';

const TEST_MODES: ReadonlyArray<{ mode: LessonTestMode; label: string }> = [
  { mode: 'both', label: 'Full test' },
  { mode: 'listening', label: 'Listening' },
  { mode: 'reading', label: 'Reading' },
];

const DIVIDER_EDGE = 'var(--color-ui-divider)';

/** Primary CTA label for the selected mock-test mode (switches to Resume when a matching run is paused). */
export function lessonTestStartLabel(mode: LessonTestMode, resuming: boolean): string {
  const verb = resuming ? 'Resume' : 'Start';
  if (mode === 'listening') return `${verb} listening`;
  if (mode === 'reading') return `${verb} reading`;
  return `${verb} mock test`;
}

function TestModeArtwork({ mode, large }: { mode: LessonTestMode; large: boolean }) {
  const box = large ? 'h-11 w-11' : 'h-9 w-9';
  if (mode === 'both') {
    return (
      <span aria-hidden="true" className={cn('relative inline-block shrink-0', box)}>
        <PlayfulNavIcon name="listening" className="absolute left-0 top-[4%] h-[66%] w-[66%] -rotate-6" />
        <PlayfulNavIcon name="curriculum" className="absolute bottom-[4%] right-0 h-[66%] w-[66%] rotate-6" />
      </span>
    );
  }
  return <PlayfulNavIcon name={mode === 'listening' ? 'listening' : 'curriculum'} className={box} />;
}

function getTestModeStatus(test: LessonTestLesson, mode: LessonTestMode, record: LessonTestRecord | undefined): string {
  const total = lessonTestQuestionCount(test, mode);
  const best = lessonTestBestForMode(record, mode);
  if (mode === 'both') {
    if (!best) return `${total} questions · Pass at ${Math.ceil(total * LESSON_TEST_PASS)}`;
    const passed = isLessonTestPassed(record);
    return `${total} questions · ${passed ? 'Passed' : 'Best'} ${best.best}/${best.total}`;
  }
  if (!best) return `${total} questions · Practice`;
  return `${total} questions · Best ${best.best}/${best.total}`;
}

interface LessonTestTitleProps {
  lessonLabel: string;
  test: LessonTestLesson;
  record: LessonTestRecord | undefined;
  isDesktop: boolean;
}

/**
 * The Test tab's title, in the Part tabs' text styles: the lesson, "Mock test" and its TOCFL band. When a lesson
 * has only one section (no mode selector below), it falls back to the single best-score progress bar.
 */
export function LessonTestTitle({ lessonLabel, test, record, isDesktop }: LessonTestTitleProps) {
  const hasBoth = lessonTestHasBothParts(test);
  const total = lessonTestQuestionCount(test);
  const best = lessonTestBestForMode(record, 'both');
  const passed = isLessonTestPassed(record);
  const score = best === null ? 'Not taken yet' : `${passed ? 'Passed ·' : 'Best'} ${best.best} / ${best.total}`;
  return (
    <div data-tone="review">
      <p className="text-xs font-black uppercase tracking-widest text-ui-muted">{lessonLabel}</p>
      <h2 className={isDesktop ? 'mt-1 text-4xl font-black leading-tight text-ui-ink-strong' : 'text-2xl font-black leading-tight text-ui-ink-strong md:text-3xl'}>
        Mock test
      </h2>
      <p className={cn('mt-1 font-extrabold text-ui-muted-strong', isDesktop ? 'text-xl' : 'text-lg')}>
        {hasBoth ? `TOCFL Band ${test.band}` : `TOCFL Band ${test.band} · ${total} questions`}
      </p>
      {!hasBoth && (
        <div className={isDesktop ? 'mt-8' : 'mt-6'}>
          <div className="mb-2.5 flex items-baseline justify-between gap-3 tabular-nums">
            <span className={cn('flex items-center gap-1.5 font-black text-ui-ink-strong', isDesktop ? 'text-lg' : 'text-base')}>
              {passed && <AppIcon name="crown" size={18} className="text-brand-primary" />}
              {score}
            </span>
            <span className="text-sm font-extrabold text-ui-muted-strong">Pass at {Math.ceil(total * LESSON_TEST_PASS)}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Best score"
            aria-valuemin={0}
            aria-valuemax={best?.total ?? total}
            aria-valuenow={best?.best ?? 0}
            className="relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-track"
          >
            {best !== null && best.best > 0 && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-primary" style={{ width: `${(best.best / best.total) * 100}%` }}>
                <div aria-hidden className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-brand-on-primary/30" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LessonTestModeButtonsProps {
  test: LessonTestLesson;
  record: LessonTestRecord | undefined;
  selected: LessonTestMode;
  onSelect: (mode: LessonTestMode) => void;
  large?: boolean;
  className?: string;
}

/** Full test / Listening / Reading: mirrors the Part tabs' ModeButtons in the Test tab's honey tone. */
export function LessonTestModeButtons({
  test,
  record,
  selected,
  onSelect,
  large = false,
  className,
}: LessonTestModeButtonsProps) {
  if (!lessonTestHasBothParts(test)) return null;
  const fullPassed = isLessonTestPassed(record);
  return (
    <div data-tone="review" role="group" aria-label="Test section" className={cn('flex flex-col gap-2.5', className)}>
      {TEST_MODES.map(({ mode, label }) => {
        const isSelected = mode === selected;
        const best = lessonTestBestForMode(record, mode);
        const fraction = best && best.total > 0 ? best.best / best.total : 0;
        const status = isSelected ? getTestModeStatus(test, mode, record) : '';
        return (
          <ActionButton
            key={mode}
            variant="secondary"
            size="lg"
            fullWidth
            aria-pressed={isSelected}
            onClick={() => onSelect(mode)}
            edgeColor={isSelected ? 'var(--color-brand-primary)' : DIVIDER_EDGE}
            className={cn(
              'justify-start gap-3 px-3 py-2.5 text-left normal-case tracking-normal !transition-transform',
              large && 'gap-3.5 px-4 py-3',
              isSelected
                ? '!border-brand-primary !bg-brand-primary-soft hover:!bg-brand-primary-soft'
                : '!border-ui-divider',
            )}
          >
            <TestModeArtwork mode={mode} large={large} />
            <span className="flex min-w-0 flex-1 flex-col justify-center">
              <span className={cn('font-black text-ui-ink-strong leading-tight', large ? 'text-lg' : 'text-[17px]')}>
                {label}
              </span>
              {status ? (
                <span className="mt-0.5 truncate text-xs font-bold text-ui-muted-strong tabular-nums">
                  {status}
                </span>
              ) : null}
            </span>
            {mode === 'both' && fullPassed ? (
              <span className="grid size-7 shrink-0 place-items-center">
                <AppIcon name="crown" size={20} className="text-brand-primary" aria-label="Passed" />
              </span>
            ) : (
              <ActivityRing fraction={fraction} label={label} />
            )}
          </ActionButton>
        );
      })}
    </div>
  );
}
