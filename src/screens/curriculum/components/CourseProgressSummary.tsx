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
        accentClassName="text-[#8E5BD9]"
        iconBackgroundClassName="bg-[#F0E7FF]"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
      <ProgressMetricCard
        label="Study streak"
        value={currentStreak}
        detail="Days in a row"
        icon="flame"
        accentClassName="text-[#FF7A1A]"
        iconBackgroundClassName="bg-[#FFF0E2]"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
      <ProgressMetricCard
        label="Practice time"
        value={practiceTimeLabel}
        detail="This session"
        icon="clock"
        accentClassName="text-feedback-success"
        iconBackgroundClassName="bg-[#E8F9DC]"
        className="min-h-[96px] lg:min-h-[clamp(72px,10dvh,96px)] lg:p-[clamp(0.6rem,1.4dvh,1rem)]"
      />
    </section>
  );
}
