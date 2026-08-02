import { useState } from 'react';
import { AppIcon, GraphPaperPanel, Soft3DButton } from '../../../lib/widgets';
import type { CourseLessonProgress } from '../../../types/models';
import { LearningActivityCard } from './LearningActivityCard';
import { LearningPathCard } from './LearningPathCard';

interface LearningPathProps {
  lessons: CourseLessonProgress[];
  isLoading: boolean;
  onToggleLesson: (id: number) => void;
  onStartQuiz?: () => void;
  onStartListening?: () => void;
  onStartReview?: () => void;
}

export function LearningPath({
  lessons,
  isLoading,
  onToggleLesson,
  onStartQuiz,
  onStartListening,
  onStartReview,
}: LearningPathProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewLessons = lessons.slice(0, 3);
  const hasCompletedLesson = lessons.some((lesson) => lesson.state === 'completed');

  return (
    <GraphPaperPanel
      gridSize="compact"
      aria-labelledby="learning-path-title"
      className="min-h-0 rounded-[20px] p-4 md:p-5 lg:h-full lg:p-[clamp(0.75rem,1.7dvh,1.25rem)]"
    >
      <div className="mb-4 flex items-center gap-2 lg:mb-[clamp(0.55rem,1.35dvh,1rem)]">
        <AppIcon name="books" size={20} className="text-brand-primary" />
        <h2 id="learning-path-title" className="text-[13px] font-black uppercase tracking-[0.08em] text-brand-primary">
          Your learning path
        </h2>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3 lg:gap-[clamp(0.5rem,1.3dvh,0.75rem)]">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-[106px] animate-pulse rounded-[17px] bg-ui-surface" />
          ))}
        </div>
      ) : isExpanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson) => (
              <LearningPathCard key={lesson.id} lesson={lesson} onToggle={onToggleLesson} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_24px_minmax(0,1fr)] md:grid-rows-[auto_20px_auto] md:gap-0 lg:grid-cols-[minmax(0,1fr)_clamp(18px,2.5vw,32px)_minmax(0,1fr)_clamp(18px,2.5vw,32px)_minmax(0,1fr)] lg:grid-rows-[auto_clamp(14px,2.2dvh,22px)_auto]">
          {previewLessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className={index === 0 ? 'md:col-start-1' : index === 1 ? 'md:col-start-3' : 'md:col-start-5'}
            >
              <LearningPathCard lesson={lesson} onToggle={onToggleLesson} />
            </div>
          ))}

          <span aria-hidden="true" className="hidden h-[3px] self-center rounded-full bg-ui-divider md:col-start-2 md:row-start-1 md:block" />
          <span aria-hidden="true" className="hidden h-[3px] self-center rounded-full bg-ui-divider md:col-start-4 md:row-start-1 md:block" />
          {[1, 3, 5].map((column) => (
            <span
              key={column}
              aria-hidden="true"
              className="mx-auto hidden h-full border-l-2 border-dashed border-ui-divider md:row-start-2 md:block"
              style={{ gridColumnStart: column }}
            />
          ))}

          <div className="md:col-start-1 md:row-start-3">
            <LearningActivityCard
              label="Quiz 1"
              title="Test your knowledge"
              description="A quick course check-in"
              icon="exam"
              iconClassName="text-[#EC4C84]"
              iconBackgroundClassName="bg-[#FFE4EE]"
              disabled={!hasCompletedLesson}
              onClick={onStartQuiz}
            />
          </div>
          <span aria-hidden="true" className="hidden border-t-2 border-dashed border-ui-divider md:col-start-2 md:row-start-3 md:block md:self-center" />
          <div className="md:col-start-3 md:row-start-3">
            <LearningActivityCard
              label="Review"
              title="Review what you learned"
              description="Strengthen recent words"
              icon="star"
              iconClassName="text-[#D89C00]"
              iconBackgroundClassName="bg-[#FFF3C4]"
              disabled={!hasCompletedLesson}
              onClick={onStartReview}
            />
          </div>
          <span aria-hidden="true" className="hidden border-t-2 border-dashed border-ui-divider md:col-start-4 md:row-start-3 md:block md:self-center" />
          <div className="md:col-start-5 md:row-start-3">
            <LearningActivityCard
              label="Practice 1"
              title="Listening & speaking"
              description="Train your Mandarin ear"
              icon="audio"
              iconClassName="text-feedback-success"
              iconBackgroundClassName="bg-[#E8F9DC]"
              disabled={!hasCompletedLesson}
              onClick={onStartListening}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-center lg:mt-auto lg:pt-[clamp(0.5rem,1.45dvh,1rem)]">
        <Soft3DButton
          type="button"
          variant="custom"
          depth="sm"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="w-auto rounded-[14px] border-ui-border bg-ui-surface px-4 py-2 text-[11px] text-ui-muted shadow-none normal-case tracking-normal"
        >
          {isExpanded ? 'Show compact path' : 'View full curriculum'}
          <AppIcon name={isExpanded ? 'expand' : 'next'} size={15} />
        </Soft3DButton>
      </div>
    </GraphPaperPanel>
  );
}

