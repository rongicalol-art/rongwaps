import { createHash } from 'node:crypto';
import type { LessonTestItem } from '../../src/types/lessonTest';

/**
 * A version's content fingerprint: 8 hex characters of the SHA-256 of its authored JSON (before recordings are
 * attached). exportLessonTests.ts stores it as `edition` on every version in the pack; the app sends it with the
 * anonymous answer counts and the learner report reads it back, so a question whose text changes starts counting
 * afresh (supabase/migrations/20261124120000_lesson_test_answers.sql).
 */
export function lessonTestEdition(version: LessonTestItem): string {
  const authored = JSON.stringify(version, (field, value) => (field === 'edition' ? undefined : value));
  return createHash('sha256').update(authored).digest('hex').slice(0, 8);
}
