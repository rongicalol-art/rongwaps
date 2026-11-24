import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonTestAnswerCounts } from '../../src/utils/lesson/lessonTestAnswerStats';
import { lessonTestScreens, planLessonTest, scoreLessonTest } from '../../src/utils/lesson/lessonTestPlan';
import { readJson } from '../acceptance_helpers';
import type { LessonTestPack } from '../../src/types/lessonTest';

const lesson = readJson<LessonTestPack>('public/data/lesson-tests/book-3.json').items.find((item) => item.key === 'b3l10')!;
const plan = planLessonTest(lesson, {}, 'answer-stats');
const screens = lessonTestScreens(lesson, plan);
const ids = screens.flatMap((screen) => screen.questionIds);

test('a first run sends every question shown, blanks as -1, with its edition and rest score', () => {
  const answers = Object.fromEntries(ids.slice(1).map((id) => [id, 0]));
  const score = scoreLessonTest(lesson, plan, answers);
  const counts = lessonTestAnswerCounts(lesson, screens, answers, score, true)!;
  assert.deepEqual(counts.map((count) => count.q), ids);
  assert.equal(counts[0].p, -1);
  assert.ok(counts.every((count) => /^[0-9a-f]{8}$/.test(count.e) && count.r >= 0 && count.r <= 1));
  const missed = new Set(score.missed.map(({ question }) => question.id));
  for (const count of counts) {
    const right = missed.has(count.q) ? 0 : 1;
    assert.equal(count.r, Math.round(((score.correct - right) / (score.total - 1)) * 1e4) / 1e4);
  }
});

test('later runs send nothing: the learner has seen the answers', () => {
  const score = scoreLessonTest(lesson, plan, {});
  assert.equal(lessonTestAnswerCounts(lesson, screens, {}, score, false), null);
});
