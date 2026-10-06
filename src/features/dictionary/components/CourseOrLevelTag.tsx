import { LevelTag } from '../../../lib/widgets';
import { useLevel } from '../../../hooks/useLevels';
import { useComponentVocabRelation } from '../../../hooks/useComponentVocabRelation';

/**
 * `LevelTag` for a dictionary row that only knows its text: the course lesson
 * when the word (or, for a single character, any course word using it) is in
 * the books, else its TOCFL level.
 */
export function CourseOrLevelTag({ text }: { text: string }) {
  const level = useLevel(text);
  const { exactVocab, usedInVocabs } = useComponentVocabRelation(text);
  const lesson = exactVocab ?? (Array.from(text).length === 1 ? usedInVocabs[0] : undefined);
  return <LevelTag bookId={lesson?.bookId} lessonId={lesson?.lessonId} level={level} />;
}
