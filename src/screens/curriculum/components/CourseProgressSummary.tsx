import { CircularProgress, ProgressMetricCard } from '../../../lib/widgets';
import type { CourseDashboardProgress } from '../../../types/models';

interface CourseProgressSummaryProps {
  progress: CourseDashboardProgress;
  currentStreak: number;
  practiceTimeLabel: string;
}

export function CourseProgressSummary({
  progress,
  currentStreak,
  practiceTimeLabel,
}: CourseProgressSummaryProps) {
  return (
    <section aria-label="Course summary" className="grid shrink-0 gap-3 sm:grid-cols-2 lg:gap-[clamp(0.5rem,1.2dvh,0.75rem)] xl:grid-cols-4">
      <ProgressMetricCard
        label="Progress"
        value={`${progress.progressPercent}%`}
        detail={`${progress.completedLessons} / ${progress.totalLessons} units`}
        leadingContent={(
          <CircularProgress
            value={progress.progressPercent}
            size={56}
            strokeWidth={7}
            label={`${progress.progressPercent}%`}
          />
        )}
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
      <ProgressMetricCard
        label="Vocabulary learned"
        value={progress.learnedWords}
        detail="Words"
        icon="cards"
        accentClassName="text-brand-secondary"
        iconBackgroundClassName="bg-brand-secondary/10"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
      <ProgressMetricCard
        label="Study streak"
        value={currentStreak}
        detail="Days in a row"
        icon="flame"
        accentClassName="text-feedback-warning-edge"
        iconBackgroundClassName="bg-feedback-warning/15"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
      <ProgressMetricCard
        label="Practice time"
        value={practiceTimeLabel}
        detail="This session"
        icon="clock"
        accentClassName="text-feedback-success"
        iconBackgroundClassName="bg-feedback-success/15"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
    </section>
  );
}
