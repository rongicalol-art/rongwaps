import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_FOUR_PART_ONE } from '../src/data/grammar/lessonFourPartOne';
import { LESSON_FOUR_PART_TWO } from '../src/data/grammar/lessonFourPartTwo';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessonFourParts = [LESSON_FOUR_PART_ONE, LESSON_FOUR_PART_TWO];
const lessonFourPages = lessonFourParts.flatMap((part) => part.grammarPages);

test('Lesson 4 has five ordered grammar points and all 19 source prompts', () => {
  assert.deepEqual(lessonFourParts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(lessonFourParts.map((part) => part.grammarPages.length), [3, 2]);
  assert.deepEqual(lessonFourPages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.equal(lessonFourPages.reduce((count, page) => count + page.questions.length, 0), 19);
  assert.ok(lessonFourPages.every((page) => page.examples.length === 3));
  assert.ok(lessonFourPages.every((page) => page.discoveryLab || page.numberLab));
});

test('Lesson 4 number grammar uses the place-value staircase', () => {
  const numberPage = lessonFourPages.find((page) => page.grammarNumber === 4);
  assert.ok(numberPage?.numberLab);
  assert.deepEqual(numberPage.numberLab.choices.map((choice) => choice.digits), [
    '105',
    '2,005',
    '90,500',
    '3,050,000',
  ]);
  assert.ok(numberPage.numberLab.choices.some((choice) => choice.traditional.includes('零')));
});

test('Every Lesson 4 grammar completes with canonical authored answers', () => {
  lessonFourPages.forEach((page) => {
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

test('Every Lesson 4 question provides a repair path', () => {
  lessonFourPages.forEach((page) => {
    page.questions.forEach((question) => {
      assert.ok(question.correctFeedback?.trim(), `${question.id} needs correct feedback`);
      assert.ok(question.repairFeedback?.trim(), `${question.id} needs repair feedback`);
      assert.ok(question.tiles.length > 1, `${question.id} needs a distractor`);
    });
  });
});

test('Lesson 4 source dialogue and audio metadata remain attached', () => {
  assert.deepEqual(LESSON_FOUR_PART_ONE.dialogue.printedPages, [91, 92, 93]);
  assert.deepEqual(LESSON_FOUR_PART_TWO.dialogue.printedPages, [100, 101, 102]);
  assert.deepEqual(lessonFourPages.map((page) => page.audioReference), [
    '04-1-3',
    '04-1-3',
    '04-1-3',
    '04-2-3',
    '04-2-3',
  ]);
});

test('All interactive lesson registries pass validation with Lesson 4', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
