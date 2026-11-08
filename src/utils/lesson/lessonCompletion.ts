/**
 * When a lesson is done (owner's rule, Nov 2026): every word learned, every grammar page reached to
 * its end (skipped exercises count), and every reading read to the end. The lesson test is optional.
 * A learner can also mark a lesson done by hand; that changes only the lesson, never cards or reviews.
 */
import type { LessonActivityBar } from '../../types/models';
import { LESSON_TEST_PASS } from './lessonTestPlan';

// A type alias (not an interface) so it is assignable to the settings jsonb column type.
export type LessonDoneMark = {
  done: boolean;
  /** ISO time of the mark: the newest wins when devices merge. */
  at: string;
};

export interface ActivityProgress {
  done: number;
  total: number;
}

/** Same key as the lesson test packs ("b3l01"). */
export const lessonProgressKey = (bookId: number, lessonId: number) => `b${bookId}l${String(lessonId).padStart(2, '0')}`;

export const isActivityDone = ({ done, total }: ActivityProgress) => done >= total;

/**
 * The lesson's activity bars. An activity the lesson does not have gets no bar; reading is left out
 * until the lesson's readings are known (`reading` null), so a bar never shows a wrong total.
 */
export function lessonActivityBars(progress: {
  words: ActivityProgress;
  grammar: ActivityProgress;
  reading: ActivityProgress | null;
}): LessonActivityBar[] {
  const bars: LessonActivityBar[] = [];
  const add = (key: LessonActivityBar['key'], { done, total }: ActivityProgress) => {
    if (total > 0) bars.push({ key, fraction: Math.min(1, done / total) });
  };
  add('words', progress.words);
  add('grammar', progress.grammar);
  if (progress.reading) add('reading', progress.reading);
  return bars;
}

/** Every activity finished. Unknown readings never count as read. */
export function isLessonComplete(progress: {
  words: ActivityProgress;
  grammar: ActivityProgress;
  reading: ActivityProgress | null;
}): boolean {
  return Boolean(progress.reading)
    && isActivityDone(progress.words)
    && isActivityDone(progress.grammar)
    && isActivityDone(progress.reading as ActivityProgress);
}

/** A lesson's done state for the Books card and the lesson window. */
export function summarizeLessonCompletion(input: {
  words: ActivityProgress;
  grammar: ActivityProgress;
  reading: ActivityProgress | null;
  mark?: LessonDoneMark;
}) {
  const isComplete = isLessonComplete(input);
  const isMarkedDone = !isComplete && Boolean(input.mark?.done);
  return { activityBars: lessonActivityBars(input), isDone: isComplete || isMarkedDone, isMarkedDone };
}

/** The lesson test counts as passed at the pass mark (its best score). */
export const isLessonTestPassed = (record?: { best: number; total: number }) =>
  Boolean(record && record.total > 0 && record.best / record.total >= LESSON_TEST_PASS);

/** Union of read readings; per lesson, the newer done mark wins. Returns only what changes locally. */
export function mergeLessonProgress(
  local: { readReadingIds: string[]; lessonDoneMarks: Record<string, LessonDoneMark> },
  cloud: { readReadingIds?: unknown; lessonDoneMarks?: unknown },
): Partial<typeof local> {
  const patch: Partial<typeof local> = {};
  const known = new Set(local.readReadingIds);
  const cloudReads = Array.isArray(cloud.readReadingIds)
    ? cloud.readReadingIds.filter((id): id is string => typeof id === 'string' && !known.has(id))
    : [];
  if (cloudReads.length) patch.readReadingIds = [...local.readReadingIds, ...new Set(cloudReads)];

  const cloudMarks = cloud.lessonDoneMarks && typeof cloud.lessonDoneMarks === 'object' && !Array.isArray(cloud.lessonDoneMarks)
    ? cloud.lessonDoneMarks as Record<string, unknown>
    : {};
  let marks: Record<string, LessonDoneMark> | null = null;
  for (const [key, value] of Object.entries(cloudMarks)) {
    if (!value || typeof value !== 'object') continue;
    const { done, at } = value as Partial<LessonDoneMark>;
    if (typeof done !== 'boolean' || typeof at !== 'string' || Number.isNaN(Date.parse(at))) continue;
    const mine = local.lessonDoneMarks[key];
    if (mine && Date.parse(mine.at) >= Date.parse(at)) continue;
    marks ??= { ...local.lessonDoneMarks };
    marks[key] = { done, at };
  }
  if (marks) patch.lessonDoneMarks = marks;
  return patch;
}
