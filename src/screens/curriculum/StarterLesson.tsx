import type { CourseLessonProgress } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { INTRODUCTION_ART } from '../../data/lessonLandscapeArt';
import { LessonItem } from './LessonItem';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface StarterLessonProps {
  starterLesson: CourseLessonProgress;
  activeBook: CourseBook;
  /** Tap on a lesson (picks it; Start opens it). */
  onOpen: (id: number, event?: React.MouseEvent) => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggle?: (id: number, event?: React.MouseEvent) => void;
  faces?: React.ReactNode;
  onLongPress?: (id: number) => void;
}

/** The Introduction is a lesson row like the rest, with its own label and art. */
export function StarterLesson({ starterLesson, activeBook, onOpen, isSelecting, isSelected, onToggle, onLongPress, faces }: StarterLessonProps) {
  if (activeBook.id !== 1 || !starterLesson) return null;

  return (
    <div className="w-full max-w-[400px]">
      <LessonItem lesson={{ ...starterLesson, label: 'Introduction' }} onOpen={onOpen} onLongPress={onLongPress} onToggle={onToggle} isSelecting={isSelecting} isSelected={isSelected} art={INTRODUCTION_ART} faces={faces} />
      <div className="mx-auto mb-5 h-6 w-1 rounded-full bg-ui-border" />
    </div>
  );
}
