import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_EIGHT_PART_ONE,
  LESSON_EIGHT_PART_TWO,
} from '../src/data/grammar/lessonEight';
import { evaluateGrammarPlacements, findCanonicalTile } from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const parts = [LESSON_EIGHT_PART_ONE, LESSON_EIGHT_PART_TWO];
const pages = parts.flatMap((part) => part.grammarPages);

test('Lesson 8 follows two source dialogues with five ordered grammar points', () => {
  assert.deepEqual(parts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(parts.map((part) => part.grammarPages.length), [2, 3]);
  assert.deepEqual(pages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.deepEqual(parts.map((part) => part.dialogue.lines.length), [9, 9]);
  assert.ok(pages.every((page) => page.examples.length >= 4));
});

test('Lesson 8 uses varied visual teaching tools intentionally', () => {
  assert.ok(pages[0].discoveryLab);
  assert.ok(pages[0].contrast);
  assert.ok(pages[1].sentenceSpine);
  assert.ok(pages[2].discoveryLab);
  assert.ok(pages[2].contrast);
  assert.ok(pages[3].discoveryLab);
  assert.ok(pages[4].sentenceSpine);
  assert.ok(pages[4].contrast);
});

test('Lesson 8 two-column patterns contain no fake empty slot', () => {
  [pages[0], pages[2]].forEach((page) => {
    assert.equal(page.patternColumns.length, 2);
    assert.ok(page.patternRows.every((row) => row.subject.length > 0));
    assert.ok(page.patternRows.every((row) => row.grammar.length > 0));
    assert.ok(page.patternRows.every((row) => row.complement.length === 0));
  });
});

test('Lesson 8 dictionary tokens never turn a complete sentence into one lookup', () => {
  const sentenceLikeTokens = pages
    .flatMap((page) => page.teachingGlossary ?? [])
    .filter((token) => /你要買鞋子|你喜歡咖啡|不想走/.test(token.traditional));
  assert.deepEqual(sentenceLikeTokens, []);
  assert.deepEqual(
    pages[2].patternRows[0].subject.map((token) => token.traditional),
    ['你', '要', '買', '鞋子'],
  );
});

test('Every Lesson 8 grammar completes with canonical authored answers', () => {
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

test('Lesson 8 content registry stays valid', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
