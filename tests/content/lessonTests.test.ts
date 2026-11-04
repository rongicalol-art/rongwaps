import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import { readJson } from '../acceptance_helpers';
import type { LessonTestLesson, LessonTestPack } from '../../src/types/lessonTest';
import { loadLessonTestContext, pictureProblems, runProblems, scopeProblems, structureProblems } from '../../scripts/content/lessonTestRules';

/**
 * Authored lesson tests (content/lesson-tests): only taught words, TOCFL-shaped questions with one key each,
 * every grammar point of the lesson in every possible run, and a review share from earlier lessons.
 * The rules live in scripts/content/lessonTestRules.ts (shared with the draft checker); guide: content/lesson-tests/README.md.
 */

const lessons: LessonTestLesson[] = readdirSync('content/lesson-tests').filter((folder) => /^book-\d+$/.test(folder))
  .flatMap((folder) => readdirSync(`content/lesson-tests/${folder}`).filter((file) => /^lesson\d+\.json$/.test(file))
    .map((file) => readJson<LessonTestLesson>(`content/lesson-tests/${folder}/${file}`)));
const ctx = loadLessonTestContext();

test('lesson tests use only words taught by their lesson', () => {
  assert.deepEqual(lessons.flatMap((lesson) => scopeProblems(lesson, ctx)), []);
});

test('lesson test questions are well formed', () => {
  assert.deepEqual(lessons.flatMap((lesson) => structureProblems(lesson, ctx)), []);
});

test('every picture a lesson test names exists', () => {
  assert.deepEqual(lessons.flatMap((lesson) => pictureProblems(lesson, ctx)), []);
});

test('every possible run tests every grammar point of the lesson and reviews earlier lessons', () => {
  assert.deepEqual(lessons.flatMap((lesson) => runProblems(lesson, ctx)), []);
});

test('the exported pack matches the authored tests, and every spoken line has a recording', () => {
  const problems: string[] = [];
  for (const lesson of lessons) {
    const pack = readJson<LessonTestPack>(`public/data/lesson-tests/book-${lesson.bookId}.json`);
    const exported = pack.items.find((item) => item.key === lesson.key);
    if (!exported) { problems.push(`${lesson.key}: not exported (npm run lesson-tests:export)`); continue; }
    // The pack is the authored lesson plus recordings: without its `audio` fields it must be identical.
    const withoutAudio = JSON.parse(JSON.stringify(exported, (field, value) => (field === 'audio' ? undefined : value)));
    if (JSON.stringify(withoutAudio) !== JSON.stringify(lesson)) problems.push(`${lesson.key}: pack is out of date (npm run lesson-tests:export)`);
    const visit = (node: unknown, path: string): void => {
      if (!node || typeof node !== 'object') return;
      const record = node as Record<string, unknown>;
      if ('speaker' in record && !record.audio) problems.push(`${lesson.key}: no recording at ${path}`);
      for (const [field, value] of Object.entries(record)) if (field !== 'audio') visit(value, `${path}.${field}`);
    };
    visit(exported, lesson.key);
    const letters = lesson.band === 'B' ? (['A', 'B', 'C', 'D'] as const) : (['A', 'B', 'C'] as const);
    if (!pack.sounds.ding || letters.some((letter) => !pack.sounds.letters?.[letter])) {
      problems.push(`book ${lesson.bookId}: the ding or a letter has no recording`);
    }
  }
  assert.deepEqual(problems, []);
});
