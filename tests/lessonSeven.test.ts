import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_SEVEN_PART_ONE,
  LESSON_SEVEN_PART_TWO,
} from '../src/data/grammar/lessonSeven';
import { evaluateGrammarPlacements, findCanonicalTile } from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const parts = [LESSON_SEVEN_PART_ONE, LESSON_SEVEN_PART_TWO];
const pages = parts.flatMap((part) => part.grammarPages);

test('Lesson 7 covers five ordered grammar points in two reading-centered parts', () => {
  assert.deepEqual(parts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(parts.map((part) => part.grammarPages.length), [3, 2]);
  assert.deepEqual(pages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.ok(pages.every((page) => page.examples.length >= 4));
  assert.ok(pages[0].routeLab);
  assert.ok(pages[1].routeLab);
});

test('Lesson 7 progresses from routes to change, topics, and paired qualities', () => {
  assert.ok(pages[0].pattern.includes('從'));
  assert.ok(pages[1].pattern.includes('travel method'));
  assert.equal(pages[2].pattern, 'New situation + 了');
  assert.equal(pages[3].pattern, 'Activity + comment');
  assert.ok(pages[4].pattern.includes('又'));
});

test('Every Lesson 7 grammar completes with canonical authored answers', () => {
  pages.forEach((page) => {
    const placements: Record<string, string> = {};
    page.questions.forEach((question) => {
      question.segments.forEach((segment) => {
        if (segment.type !== 'blank') return;
        const tile = findCanonicalTile(question, segment.answer, segment.answerSimplified);
        assert.ok(tile, `${page.id} ${segment.id} needs a canonical tile`);
        placements[segment.id] = tile.id;
      });
    });
    assert.equal(evaluateGrammarPlacements(page.questions, placements).complete, true, page.id);
  });
});

test('Lesson 7 content registry stays valid', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
