import type { CourseLessonProgress } from '../../../types/models';
import { getInteractiveGrammarPartsForLesson } from '../../../data/interactiveGrammarPages';
import { CourseLessonTile } from './CourseLessonTile';

interface CourseLessonGridProps {
  activeBookId: number;
  lessons: CourseLessonProgress[];
  isLoading: boolean;
  onSelectLesson: (id: number) => void;
  onStartGrammarPart?: (partId: string) => void;
  startedGrammarPartIds: string[];
  completedGrammarPageIds: string[];
  completedGrammarPartIds: string[];
}

export function CourseLessonGrid({
  activeBookId,
  lessons,
  isLoading,
  onSelectLesson,
  onStartGrammarPart,
  startedGrammarPartIds,
  completedGrammarPageIds,
  completedGrammarPartIds,
}: CourseLessonGridProps) {
  const firstLessonId = lessons[0]?.id;
  const lastLessonId = lessons.at(-1)?.id;
  const lessonRangeLabel = firstLessonId !== undefined && lastLessonId !== undefined
    ? `Lessons ${firstLessonId}-${lastLessonId}`
    : 'No lessons available';

  return (
    <section aria-labelledby="course-lessons-heading" className="relative z-10 mt-7 sm:mt-8">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <h2
          id="course-lessons-heading"
          className="text-[15px] font-black uppercase tracking-[0.08em] text-ui-ink-strong sm:text-[16px]"
        >
          Lessons
        </h2>
        <p className="text-xs font-bold text-ui-muted sm:text-sm">
          {isLoading ? 'Loading lessons…' : lessonRangeLabel}
        </p>
      </div>

      {isLoading && lessons.length === 0 ? (
        <div
          aria-label="Loading course lessons"
          className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="min-h-[94px] animate-pulse rounded-[19px] border-b-2 border-ui-border bg-ui-surface/80"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4">
          {lessons.map((lesson) => (
            <CourseLessonTile
              key={lesson.id}
              lesson={lesson}
              grammarParts={getInteractiveGrammarPartsForLesson(activeBookId, lesson.id)}
              onSelect={onSelectLesson}
              onStartGrammarPart={onStartGrammarPart}
              startedGrammarPartIds={startedGrammarPartIds}
              completedGrammarPageIds={completedGrammarPageIds}
              completedGrammarPartIds={completedGrammarPartIds}
            />
          ))}
        </div>
      )}
    </section>
  );
}
