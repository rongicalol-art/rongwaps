import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_SIX_PART_ONE } from '../src/data/grammar/lessonSixPartOne';
import { LESSON_SIX_PART_TWO } from '../src/data/grammar/lessonSixPartTwo';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessonSixParts = [LESSON_SIX_PART_ONE, LESSON_SIX_PART_TWO];
const lessonSixPages = lessonSixParts.flatMap((part) => part.grammarPages);

test('Lesson 6 has four ordered grammar points and all 24 source prompts', () => {
  assert.deepEqual(lessonSixParts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(lessonSixParts.map((part) => part.grammarPages.length), [2, 2]);
  assert.deepEqual(lessonSixPages.map((page) => page.grammarNumber), [1, 2, 3, 4]);
  assert.equal(lessonSixPages.reduce((count, page) => count + page.questions.length, 0), 24);
  assert.ok(lessonSixPages.every((page) => page.examples.length >= 3));
  assert.ok(lessonSixPages.every((page) => page.discoveryLab));
});

test('The 得 grammar remains one point with four progressive frames', () => {
  const performancePage = lessonSixPages[1];
  assert.equal(performancePage.questions.length, 12);
  assert.deepEqual(
    [...new Set(performancePage.questions.map((question) => question.sectionLabel))],
    [
      '1 · Simple verb + 得',
      '2 · Repeat verb after V+O',
      '3 · Object as topic',
      '4 · Possessor + 的 + object',
    ],
  );
  assert.deepEqual(
    performancePage.discoveryLab?.choices.filter((choice) => !choice.isCorrection).map((choice) => choice.id),
    ['g2-simple', 'g2-repeat', 'g2-object', 'g2-owned'],
  );
});

test('The 可以 grammar teaches suggestion and permission separately', () => {
  const permissionPage = lessonSixPages[3];
  assert.deepEqual(
    [...new Set(permissionPage.questions.map((question) => question.sectionLabel))],
    ['1 · Give a suggestion', '2 · State permission', '2 · Ask and answer permission'],
  );
  assert.ok(permissionPage.contrast?.items.some((item) => item.traditional.includes('會')));
  assert.ok(permissionPage.questions.some((question) => question.segments.filter((segment) => segment.type === 'blank').length === 2));
});

test('Every Lesson 6 grammar completes with canonical authored answers', () => {
  lessonSixPages.forEach((page) => {
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

test('Every Lesson 6 question provides a repair path', () => {
  lessonSixPages.forEach((page) => {
    page.questions.forEach((question) => {
      assert.ok(question.correctFeedback?.trim(), `${question.id} needs correct feedback`);
      assert.ok(question.repairFeedback?.trim(), `${question.id} needs repair feedback`);
      assert.ok(question.tiles.length > 1, `${question.id} needs a distractor`);
    });
  });
});

test('Lesson 6 source dialogue and audio metadata remain attached', () => {
  assert.deepEqual(LESSON_SIX_PART_ONE.dialogue.printedPages, [131, 132]);
  assert.deepEqual(LESSON_SIX_PART_TWO.dialogue.printedPages, [141, 142]);
  assert.deepEqual(lessonSixPages.map((page) => page.audioReference), [
    '06-1-3',
    '06-1-3',
    '06-2-3',
    '06-2-3',
  ]);
  assert.equal(
    LESSON_SIX_PART_TWO.dialogue.lines[0].text.traditional,
    '聽說這部電影很有趣，我們晚一起去看，好不好？',
  );
});

test('All interactive lesson registries pass validation with Lesson 6', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
