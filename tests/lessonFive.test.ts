import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_FIVE_PART_ONE } from '../src/data/grammar/lessonFivePartOne';
import { LESSON_FIVE_PART_TWO } from '../src/data/grammar/lessonFivePartTwo';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessonFiveParts = [LESSON_FIVE_PART_ONE, LESSON_FIVE_PART_TWO];
const lessonFivePages = lessonFiveParts.flatMap((part) => part.grammarPages);

test('Lesson 5 has five ordered grammar points and all 16 source prompts', () => {
  assert.deepEqual(lessonFiveParts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(lessonFiveParts.map((part) => part.grammarPages.length), [3, 2]);
  assert.deepEqual(lessonFivePages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.equal(lessonFivePages.reduce((count, page) => count + page.questions.length, 0), 16);
  assert.ok(lessonFivePages.every((page) => page.examples.length === 3));
  assert.ok(lessonFivePages.every((page) => page.discoveryLab));
});

test('Lesson 5 progresses from location to action, direction, and existence', () => {
  assert.deepEqual(lessonFivePages.map((page) => page.pattern), [
    'Person or thing +（不）在 + place',
    'Person + 在 + place + action',
    'Situation, suggested action + 吧',
    'Thing + 在 + anchor noun + direction',
    'Place + 有 / 沒有 + thing',
  ]);
  assert.ok(lessonFivePages[3].contrast);
  assert.ok(lessonFivePages[4].contrast);
});

test('Every Lesson 5 grammar completes with canonical authored answers', () => {
  lessonFivePages.forEach((page) => {
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

test('Every Lesson 5 question provides a repair path', () => {
  lessonFivePages.forEach((page) => {
    page.questions.forEach((question) => {
      assert.ok(question.correctFeedback?.trim(), `${question.id} needs correct feedback`);
      assert.ok(question.repairFeedback?.trim(), `${question.id} needs repair feedback`);
      assert.ok(question.tiles.length > 1, `${question.id} needs a distractor`);
    });
  });
});

test('Lesson 5 picture prompts keep their source cues', () => {
  assert.equal(lessonFivePages[0].exerciseCues?.length, 3);
  assert.equal(lessonFivePages[2].exerciseCues?.length, 3);
  assert.equal(lessonFivePages[3].exerciseCues?.length, 4);
});

test('Lesson 5 source dialogue and audio metadata remain attached', () => {
  assert.deepEqual(LESSON_FIVE_PART_ONE.dialogue.printedPages, [112, 113]);
  assert.deepEqual(LESSON_FIVE_PART_TWO.dialogue.printedPages, [119, 120, 121]);
  assert.deepEqual(lessonFivePages.map((page) => page.audioReference), [
    '05-1-3',
    '05-1-3',
    '05-1-3',
    '05-2-3',
    '05-2-3',
  ]);
});

test('All interactive lesson registries pass validation with Lesson 5', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
