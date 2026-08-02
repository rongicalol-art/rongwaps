import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_THREE_PART_ONE } from '../src/data/grammar/lessonThreePartOne';
import { LESSON_THREE_PART_TWO } from '../src/data/grammar/lessonThreePartTwo';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessonThreeParts = [LESSON_THREE_PART_ONE, LESSON_THREE_PART_TWO];
const lessonThreePages = lessonThreeParts.flatMap((part) => part.grammarPages);

test('Lesson 3 has five ordered grammar points grouped by its two dialogues', () => {
  assert.deepEqual(lessonThreeParts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(lessonThreeParts.map((part) => part.grammarPages.length), [2, 3]);
  assert.deepEqual(lessonThreePages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.equal(lessonThreePages.reduce((count, page) => count + page.questions.length, 0), 15);
  assert.ok(lessonThreePages.every((page) => page.examples.length === 3));
  assert.ok(lessonThreePages.every((page) => page.discoveryLab));
});

test('Every Lesson 3 grammar completes with canonical authored answers', () => {
  lessonThreePages.forEach((page) => {
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

test('Lesson 3 distractors cannot complete a grammar', () => {
  const pagesWithDistractors = lessonThreePages.filter((page) => (
    page.questions.every((question) => question.tiles.length > question.segments.filter((segment) => segment.type === 'blank').length)
  ));

  pagesWithDistractors.forEach((page) => {
    const placements: Record<string, string> = {};
    page.questions.forEach((question) => {
      const blank = question.segments.find((segment) => segment.type === 'blank');
      if (!blank || blank.type !== 'blank') return;
      const wrongTile = question.tiles.find((tile) => (
        tile.traditional !== blank.answer
        && (!blank.answerSimplified || tile.simplified !== blank.answerSimplified)
      ));
      assert.ok(wrongTile, `${question.id} needs a distractor`);
      placements[blank.id] = wrongTile.id;
    });
    assert.equal(evaluateGrammarPlacements(page.questions, placements).complete, false, page.id);
  });
});

test('Lesson 3 dialogue and source metadata stay attached to each part', () => {
  assert.deepEqual(LESSON_THREE_PART_ONE.dialogue.printedPages, [69, 70]);
  assert.deepEqual(LESSON_THREE_PART_TWO.dialogue.printedPages, [76, 77]);
  assert.deepEqual(lessonThreePages.map((page) => page.audioReference), [
    '03-1-3',
    '03-1-3',
    '03-2-3',
    '03-2-3',
    '03-2-3',
  ]);
});

test('All interactive lesson registries pass validation with Lesson 3', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
