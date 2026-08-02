import { AppIcon, CircularProgress, CustomProgressBar, Soft3DButton } from '../../../lib/widgets';
import type { CourseDashboardProgress } from '../../../types/models';

interface CourseProgressPanelProps {
  progress: CourseDashboardProgress;
  isLoading: boolean;
  canPractice: boolean;
  onPractice: () => void;
}

export function CourseProgressPanel({
  progress,
  isLoading,
  canPractice,
  onPractice,
}: CourseProgressPanelProps) {
  const currentLesson = progress.lessons.find(
    (lesson) => lesson.id === progress.currentLessonId,
  );
  const lastLessonId = progress.lessons.at(-1)?.id;
  const currentLessonLabel = currentLesson?.label ?? 'Current lesson';
  const lessonProgressLabel = isLoading
    ? 'Loading your course…'
    : currentLesson && lastLessonId !== undefined
      ? `Lesson ${currentLesson.id} of ${lastLessonId}`
      : 'No lessons available';

  return (
    <section
      aria-label="Course progress"
      className="relative z-10 ml-auto w-full rounded-[26px] border border-ui-divider border-b-[5px] bg-ui-surface/95 p-4 shadow-[0_12px_32px_rgba(47,50,55,0.10)] sm:p-5 xl:w-[72%] xl:p-6"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 lg:grid-cols-[auto_minmax(0,1fr)_180px] lg:gap-x-6">
        <CircularProgress
          value={progress.progressPercent}
          size={96}
          strokeWidth={10}
          label={<span className="text-xl font-black">{progress.progressPercent}%</span>}
          className="drop-shadow-sm"
        />

        <div className="min-w-0">
          <h2 className="text-[18px] font-black text-ui-ink-strong sm:text-[20px]">
            Course Progress
          </h2>
          <p className="mt-2 text-sm font-bold text-ui-muted sm:text-[15px]">
            {lessonProgressLabel}
          </p>
          <CustomProgressBar
            progress={progress.progressPercent}
            className="mt-3"
          />
        </div>

        <div className="col-span-2 pt-1 lg:col-span-1 lg:pt-0">
          <Soft3DButton
            type="button"
            variant="primary"
            depth="sm"
            disabled={!canPractice}
            onClick={onPractice}
            aria-label={`Continue ${currentLessonLabel.toLowerCase()}`}
            className="min-h-[76px] justify-start gap-3 rounded-[18px] px-4 py-3 text-left normal-case tracking-normal shadow-[0_7px_18px_rgba(28,176,246,0.22)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/20 text-white">
              <AppIcon name="play" size={20} />
            </span>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="text-[15px] font-black text-white">Continue</span>
              <span className="mt-1 text-[11px] font-bold text-white/80">
                {isLoading ? 'Getting ready…' : currentLessonLabel}
              </span>
            </span>
          </Soft3DButton>
        </div>
      </div>
    </section>
  );
}
