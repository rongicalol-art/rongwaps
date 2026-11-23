import type { LessonTestLesson } from '../../types/lessonTest';
import { lessonItemIndex, type LessonTestScore, type LessonTestScreen } from './lessonTestPlan';

/** One question of a finished run, as the anonymous answer counts take it (record_lesson_test_answers). */
export interface LessonTestAnswerCount {
  /** Question id. */
  q: string;
  /** The version's content edition from the pack. */
  e: string;
  /** The picked choice (original index), or -1 when left blank. */
  p: number;
  /** Rest score: the run's other questions right ÷ their number, so a question isn't judged by its own answer. */
  r: number;
}

/**
 * What a finished run adds to the anonymous counts: every question shown, or null when the run can't count (a
 * learner's later runs, after they've seen the answers; a single-question run; a pack without editions).
 */
export function lessonTestAnswerCounts(
  lesson: LessonTestLesson,
  screens: LessonTestScreen[],
  answers: Record<string, number>,
  score: LessonTestScore,
  firstRun: boolean,
): LessonTestAnswerCount[] | null {
  if (!firstRun || score.total < 2) return null;
  const items = lessonItemIndex(lesson);
  const missed = new Set(score.missed.map(({ question }) => question.id));
  const counts: LessonTestAnswerCount[] = [];
  for (const screen of screens) {
    const edition = items.get(screen.itemId)?.edition;
    if (!edition) return null;
    for (const id of screen.questionIds) {
      const right = missed.has(id) ? 0 : 1;
      counts.push({ q: id, e: edition, p: answers[id] ?? -1, r: Math.round(((score.correct - right) / (score.total - 1)) * 1e4) / 1e4 });
    }
  }
  return counts.length ? counts : null;
}
