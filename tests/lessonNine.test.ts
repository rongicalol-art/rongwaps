import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_NINE_PART_ONE,
  LESSON_NINE_PART_TWO,
} from '../src/data/grammar/lessonNine';
import { evaluateGrammarPlacements, findCanonicalTile } from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const parts = [LESSON_NINE_PART_ONE, LESSON_NINE_PART_TWO];
const pages = parts.flatMap((part) => part.grammarPages);

test('Lesson 9 follows two source dialogues with five ordered grammar points', () => {
  assert.deepEqual(parts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(parts.map((part) => part.grammarPages.length), [3, 2]);
  assert.deepEqual(pages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.deepEqual(parts.map((part) => part.dialogue.lines.length), [8, 8]);
  assert.deepEqual(pages.map((page) => page.printedPages[0]), [205, 206, 207, 213, 216]);
  assert.ok(pages.every((page) => page.examples.length >= 5));
});

test('Lesson 9 gives every grammar point its own visual manipulative', () => {
  assert.ok(pages[0].liveSceneLab);
  assert.ok(pages[1].timeRangeLab);
  assert.ok(pages[2].sequenceLab);
  assert.ok(pages[3].abilityLab);
  assert.ok(pages[4].compareLab);
});

test('Lesson 9 keeps authored pattern shapes compact', () => {
  assert.deepEqual(pages.map((page) => page.patternColumns.length), [3, 2, 2, 3, 3]);
  assert.ok(pages[1].patternRows.every((row) => row.complement.length === 0));
  assert.ok(pages[2].patternRows.every((row) => row.complement.length === 0));
  assert.deepEqual(
    pages[4].patternRows[1].grammar.map((word) => word.traditional),
    ['跑', '得', '比較'],
  );
});

test('Every Lesson 9 grammar completes with canonical authored answers', () => {
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

test('Lesson 9 content registry stays valid', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
