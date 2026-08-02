import type { CourseLessonProgress } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { INTRODUCTION_ART } from '../../data/lessonLandscapeArt';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface StarterLessonProps {
  starterLesson: CourseLessonProgress;
  activeBook: CourseBook;
  isSelected: boolean;
  onToggleLesson: (id: number) => void;
}

export function StarterLesson({ starterLesson, activeBook, isSelected, onToggleLesson }: StarterLessonProps) {
  if (activeBook.id !== 1 || !starterLesson) return null;

  return (
    <div className="mb-8 w-full max-w-[400px]">
      <button
        type="button"
        onClick={() => onToggleLesson(starterLesson.id)}
        aria-pressed={isSelected}
        style={isSelected ? { borderColor: activeBook.edgeHex } : undefined}
        className={`group flex w-full cursor-pointer items-center justify-between rounded-[24px] bg-ui-surface p-4 text-left outline-none transition-colors duration-300 focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${
          isSelected
            ? 'border-2 border-b-[6px] border-ui-border'
            : 'border-b-4 border-ui-border hover:bg-ui-surface-hover'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center">
            <img
              src={INTRODUCTION_ART}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p
              className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 transition-colors duration-300 ${
                isSelected ? activeBook.accent : 'text-ui-muted'
              }`}
            >
              Introduction
            </p>
            <h2
              className={`text-[17px] font-extrabold truncate transition-colors duration-300 ${
                isSelected ? 'text-ui-ink' : 'text-ui-muted'
              }`}
            >
              {starterLesson.title}
            </h2>
          </div>
        </div>
      </button>
      <div className="mx-auto mt-2 h-8 w-1 rounded-full bg-ui-border" />
    </div>
  );
}
