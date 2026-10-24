import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_NINE_PART_ONE,
  LESSON_NINE_PART_TWO,
} from '../../src/data/grammar/lessonNine';
import { evaluateGrammarPlacements, findCanonicalTile } from '../../src/utils/grammar/grammarExercise';
import { getPatternRowGroups } from '../../src/utils/grammar/grammarPatternLayout';
import type { GrammarPractice } from '../../src/types/models';
import { readJson, validateInteractiveLessons } from '../acceptance_helpers';

const parts = [LESSON_NINE_PART_ONE, LESSON_NINE_PART_TWO];
const pages = parts.flatMap((part) => part.grammarPages);

test('Lesson 9 follows two source dialogues with five ordered grammar points', () => {
  assert.deepEqual(parts.map((part) => part.partId), [1, 2]);
  assert.deepEqual(parts.map((part) => part.grammarPages.length), [3, 2]);
  assert.deepEqual(pages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.deepEqual(parts.map((part) => part.dialogue.lines.length), [8, 8]);
  assert.deepEqual(pages.map((page) => page.printedPages[0]), [205, 206, 207, 213, 216]);
  // Printed numbered examples: three on each page, except 能's three groups of three.
  assert.deepEqual(pages.map((page) => page.examples.length), [3, 3, 3, 9, 3]);
});

test('Lesson 9 preserves every printed exercise under its grammar point', () => {
  const practice = readJson<Record<string, GrammarPractice>>('content/grammar-practice/lessonNine.json');
  assert.deepEqual(Object.keys(practice), pages.map((page) => page.id));
  assert.deepEqual(pages.map((page) => practice[page.id].items.filter((item) => item.source !== 'own').map((item) => item.source)), [
    ['p.206 #1', 'p.206 #2', 'p.206 #3'],
    ['p.207 #1', 'p.207 #2', 'p.207 #3'],
    ['p.208 #1', 'p.208 #2', 'p.208 #3'],
    ['p.213 #1', 'p.213 #2', 'p.213 #3', 'p.214 #1', 'p.214 #2', 'p.214 #3', 'p.215 #1', 'p.215 #2', 'p.215 #3'],
    ['p.216 #1', 'p.216 #2', 'p.217 #3'],
  ]);
});

test('Lesson 9 tables retain the printed grids without inventing tables for prose sections', () => {
  assert.deepEqual(pages.map((page) => page.patternColumns.length), [3, 0, 6, 0, 4]);
  assert.deepEqual(pages[1].patternRows, []);
  assert.deepEqual(pages[3].subsections?.map((section) => section.patternRows?.length ?? 0), [0, 0, 0]);
  assert.deepEqual(pages[2].patternRows.map((row) => getPatternRowGroups(row).length), [6, 6]);
  assert.deepEqual(
    pages[4].patternRows.map((row) => getPatternRowGroups(row).flat().map((word) => word.traditional).join('')),
    ['今天的天氣比較熱', '哥哥跑得比較快'],
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
