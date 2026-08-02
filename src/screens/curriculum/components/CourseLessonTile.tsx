import { AppIcon, Soft3DButton } from '../../../lib/widgets';
import type { CourseLessonProgress, InteractiveGrammarPart } from '../../../types/models';
import { cn } from '../../../utils/cn';
import {
  getGrammarPathStatus,
  type LearningPathStatus,
} from '../../../utils/lessonProgress';
import { getEnglishLessonTitle } from '../../../utils/lessonTitle';

interface CourseLessonTileProps {
  lesson: CourseLessonProgress;
  grammarParts?: InteractiveGrammarPart[];
  onSelect: (id: number) => void;
  onStartGrammarPart?: (partId: string) => void;
  startedGrammarPartIds: string[];
  completedGrammarPageIds: string[];
  completedGrammarPartIds: string[];
}

export function CourseLessonTile({
  lesson,
  grammarParts = [],
  onSelect,
  onStartGrammarPart,
  startedGrammarPartIds,
  completedGrammarPageIds,
  completedGrammarPartIds,
}: CourseLessonTileProps) {
  const isLocked = lesson.state === 'locked';
  const isCurrent = lesson.state === 'current';
  const isCompleted = lesson.isFullyCompleted;
  const isHighlighted = lesson.isSelected || isCurrent;

  const statusLabel = isLocked
    ? 'Locked'
    : isCompleted
      ? 'Completed'
      : lesson.isSelected
        ? 'Selected'
        : isCurrent
          ? 'Current lesson'
          : 'Available';
  const pathStatusLabel = (status: LearningPathStatus) => (
    status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In progress' : 'Not started'
  );
  const englishTitle = getEnglishLessonTitle(lesson.title);

  return (
    <div className="min-w-0">
      <Soft3DButton
        type="button"
        variant="custom"
        depth="sm"
        disabled={isLocked}
        onClick={() => onSelect(lesson.id)}
        aria-label={`${lesson.label}. ${englishTitle}: ${statusLabel}. ${lesson.isSelected ? 'Deselect lesson' : 'Select lesson'}.`}
        aria-pressed={lesson.isSelected}
        className={cn(
          'relative min-h-[94px] items-start justify-start rounded-[19px] px-5 py-4 text-left normal-case tracking-normal shadow-[0_7px_18px_rgba(47,50,55,0.06)] hover:scale-[1.015] focus-visible:ring-4 focus-visible:ring-brand-primary/20',
          isHighlighted && 'border-brand-primary-edge bg-[#F1F7FF] ring-2 ring-brand-primary',
          !isHighlighted && isCompleted && 'border-[#46A302] bg-ui-surface',
          !isHighlighted && !isCompleted && !isLocked && 'border-ui-border bg-ui-surface',
          isLocked && 'border-ui-border bg-ui-canvas text-ui-muted',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col items-start pr-8">
          <span className="text-[12px] font-black uppercase leading-none tracking-[0.06em] text-brand-primary">
            {lesson.label}
          </span>
          <span className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-[1.18] text-ui-ink-strong sm:text-[16px]">
            {englishTitle}
          </span>
        </span>

        {(lesson.isSelected || isCompleted || isCurrent || isLocked) && (
          <span
            className={cn(
              'absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full',
              (lesson.isSelected || isCurrent) && 'bg-brand-primary text-white',
              !lesson.isSelected && !isCurrent && isCompleted && 'bg-feedback-success text-white',
              isLocked && 'bg-ui-border text-ui-muted',
            )}
          >
            <AppIcon
              name={isLocked ? 'lock' : lesson.isSelected || isCompleted ? 'check' : 'play'}
              size={17}
            />
          </span>
        )}
      </Soft3DButton>

      {grammarParts.length > 0 && onStartGrammarPart && (
        <div className="mt-2 space-y-2" aria-label={`Lesson ${lesson.id} grammar learning paths`}>
          {grammarParts.map((grammarPart) => {
            const printedPages = grammarPart.grammarPages.flatMap((grammarPage) => grammarPage.printedPages);
            const firstPage = Math.min(...printedPages);
            const lastPage = Math.max(...printedPages);
            const pageLabel = firstPage === lastPage ? `Page ${firstPage}` : `Pages ${firstPage}–${lastPage}`;
            const pathStatus = getGrammarPathStatus(
              grammarPart,
              startedGrammarPartIds,
              completedGrammarPageIds,
              completedGrammarPartIds,
            );

            return (
            <Soft3DButton
              key={grammarPart.id}
              type="button"
              variant="custom"
              depth="sm"
              disabled={isLocked}
              onClick={() => onStartGrammarPart(grammarPart.id)}
              className="justify-start rounded-[16px] border-[#D89C00] bg-[#FFF3C4] px-4 py-3 text-left normal-case tracking-normal text-ui-ink-strong shadow-[0_6px_14px_rgba(255,200,0,0.14)]"
              aria-label={`Open Lesson ${grammarPart.lessonId}, Part ${grammarPart.partId} grammar path. ${pathStatusLabel(pathStatus)}.`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FFC800] text-white">
                <AppIcon name="sparkles" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-black text-[#A66A00]">Part {grammarPart.partId} · Grammar</span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-ui-muted-strong">
                  {grammarPart.grammarPages.length}{' '}
                  {grammarPart.grammarPages.length === 1 ? 'grammar point' : 'grammar points'} · {pageLabel}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] font-black text-[#A66A00]">
                {pathStatus === 'completed' ? 'Done' : pathStatus === 'in-progress' ? 'Continue' : 'Start'}
                <AppIcon name={pathStatus === 'completed' ? 'check' : 'next'} size={17} />
              </span>
            </Soft3DButton>
            );
          })}
        </div>
      )}

    </div>
  );
}
