import { supabase } from './supabaseClient';
import type { Json } from '../types/database';
import type { LessonTestAnswerCount } from '../utils/lesson/lessonTestAnswerStats';

/**
 * Adds a learner's first finished run of a lesson test to the anonymous answer counts
 * (supabase/migrations/20261124120000_lesson_test_answers.sql), so the learner report can find questions to fix.
 * Best effort: signed out or offline, nothing is counted and the learner sees nothing. Local development never
 * sends, so testing doesn't skew the numbers.
 */
export async function shareLessonTestAnswers(lessonKey: string, counts: LessonTestAnswerCount[] | null): Promise<void> {
  if (import.meta.env.DEV || !counts?.length) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.rpc('record_lesson_test_answers', { p_lesson: lessonKey, p_answers: counts as unknown as Json });
  } catch {
    // Statistics only: a failure costs one data point, never the learner's result.
  }
}
