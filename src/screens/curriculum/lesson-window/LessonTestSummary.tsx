import { AppIcon } from '../../../lib/widgets';
import type { LessonTestLesson } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PASS, lessonTestQuestionCount } from '../../../utils/lesson/lessonTestPlan';

interface LessonTestTitleProps {
  lessonLabel: string;
  test: LessonTestLesson;
  best: { correct: number; total: number } | null;
  isDesktop: boolean;
}

/**
 * The Test tab's title, in the Part tabs' text styles: the lesson, "Mock test", its TOCFL band and length. Where the
 * Part tabs list their modes, the best score sits on the app's progress bar, with the pass mark in words.
 */
export function LessonTestTitle({ lessonLabel, test, best, isDesktop }: LessonTestTitleProps) {
  const total = lessonTestQuestionCount(test);
  const passed = best !== null && best.correct / best.total >= LESSON_TEST_PASS;
  const score = best === null ? 'Not taken yet' : `${passed ? 'Passed ·' : 'Best'} ${best.correct} / ${best.total}`;
  return (
    <div data-tone="review">
      <p className="text-xs font-black uppercase tracking-widest text-ui-muted">{lessonLabel}</p>
      <h2 className={isDesktop ? 'mt-1 text-4xl font-black leading-tight text-ui-ink-strong' : 'text-2xl font-black leading-tight text-ui-ink-strong md:text-3xl'}>
        Mock test
      </h2>
      <p className={cn('mt-1 font-extrabold text-ui-muted-strong', isDesktop ? 'text-xl' : 'text-lg')}>
        TOCFL Band {test.band} · {total} questions
      </p>
      <div className={isDesktop ? 'mt-8' : 'mt-6'}>
        <div className="mb-2.5 flex items-baseline justify-between gap-3 tabular-nums">
          <span className={cn('flex items-center gap-1.5 font-black text-ui-ink-strong', isDesktop ? 'text-lg' : 'text-base')}>
            {passed && <AppIcon name="crown" size={18} className="text-brand-primary" />}
            {score}
          </span>
          <span className="text-sm font-extrabold text-ui-muted-strong">Pass at {Math.ceil(total * LESSON_TEST_PASS)}</span>
        </div>
        {/* The practice header's progress bar, still: track, fill, and its light streak. */}
        <div
          role="progressbar"
          aria-label="Best score"
          aria-valuemin={0}
          aria-valuemax={best?.total ?? total}
          aria-valuenow={best?.correct ?? 0}
          className="relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-track"
        >
          {best !== null && best.correct > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-primary" style={{ width: `${(best.correct / best.total) * 100}%` }}>
              <div aria-hidden className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/30" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
