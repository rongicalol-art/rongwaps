import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_FIFTEEN_PART_ONE,
  LESSON_FIFTEEN_PART_TWO,
  LESSON_FIFTEEN_PART_THREE,
} from '../src/data/grammar/lessonFifteen';
import {
  LESSON_SIXTEEN_PART_ONE,
  LESSON_SIXTEEN_PART_TWO,
} from '../src/data/grammar/lessonSixteen';
import { ALL_READINGS, READING_LESSON_MIN, READING_LESSON_MAX } from '../src/data/readings';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

test('Lesson 15 and 16 interactive grammar parts are registered and ordered', () => {
  const l15Parts = [LESSON_FIFTEEN_PART_ONE, LESSON_FIFTEEN_PART_TWO, LESSON_FIFTEEN_PART_THREE];
  assert.deepEqual(l15Parts.map((p) => p.partId), [1, 2, 3]);
  assert.deepEqual(l15Parts.map((p) => p.grammarPages.length), [1, 1, 1]);

  const l16Parts = [LESSON_SIXTEEN_PART_ONE, LESSON_SIXTEEN_PART_TWO];
  assert.deepEqual(l16Parts.map((p) => p.partId), [1, 2]);
  assert.deepEqual(l16Parts.map((p) => p.grammarPages.length), [1, 4]);

  const l15Pages = l15Parts.flatMap((p) => p.grammarPages);
  assert.deepEqual(l15Pages.map((p) => p.grammarNumber), [1, 2, 3]);

  const l16Pages = l16Parts.flatMap((p) => p.grammarPages);
  assert.deepEqual(l16Pages.map((p) => p.grammarNumber), [1, 2, 3, 4, 5]);
});

test('Every Lesson 15 and 16 grammar page has examples, questions, confusion, and glossary', () => {
  const allPages = [
    ...LESSON_FIFTEEN_PART_ONE.grammarPages,
    ...LESSON_FIFTEEN_PART_TWO.grammarPages,
    ...LESSON_FIFTEEN_PART_THREE.grammarPages,
    ...LESSON_SIXTEEN_PART_ONE.grammarPages,
    ...LESSON_SIXTEEN_PART_TWO.grammarPages,
  ];

  allPages.forEach((page) => {
    assert.ok(page.examples.length >= 3, `${page.id} must have >= 3 examples`);
    assert.ok(page.questions.length >= 3, `${page.id} must have >= 3 questions`);
    assert.ok(page.confusion && page.confusion.items.length >= 2, `${page.id} must have confusion items`);
    assert.ok(page.teachingGlossary && page.teachingGlossary.length > 0, `${page.id} must have teaching glossary`);
  });
});

test('Every Lesson 15 and 16 question completes with its canonical authored tile', () => {
  const allPages = [
    ...LESSON_FIFTEEN_PART_ONE.grammarPages,
    ...LESSON_FIFTEEN_PART_TWO.grammarPages,
    ...LESSON_FIFTEEN_PART_THREE.grammarPages,
    ...LESSON_SIXTEEN_PART_ONE.grammarPages,
    ...LESSON_SIXTEEN_PART_TWO.grammarPages,
  ];

  allPages.forEach((page) => {
    const placements: Record<string, string> = {};
    page.questions.forEach((question) => {
      question.segments.forEach((segment) => {
        if (segment.type !== 'blank') return;
        const tile = findCanonicalTile(question, segment.answer, segment.answerSimplified);
        assert.ok(tile, `${page.id} ${segment.id} needs a canonical tile for answer: ${segment.answer}`);
        placements[segment.id] = tile.id;
      });
    });

    const result = evaluateGrammarPlacements(page.questions, placements);
    assert.equal(result.complete, true, `${page.id} should evaluate complete`);
  });
});

test('Reader includes Lessons 15 and 16 with authentic dialogues and reading', () => {
  assert.equal(READING_LESSON_MIN, 1);
  assert.equal(READING_LESSON_MAX, 16);

  const l15Readings = ALL_READINGS.filter((r) => r.lessonId === 15);
  assert.equal(l15Readings.length, 3, 'Lesson 15 has 3 readings (Dialogue 1, Dialogue 2, Short Reading)');

  const l16Readings = ALL_READINGS.filter((r) => r.lessonId === 16);
  assert.equal(l16Readings.length, 3, 'Lesson 16 has 3 readings (Dialogue 1, Dialogue 2, Short Reading)');
});

test('Lessons 15 and 16 maintain full interactive curriculum validity', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});

test('Lesson 15 Parts 1, 2, and 3 have exported textbook page assets', () => {
  assert.equal(LESSON_FIFTEEN_PART_ONE.grammarPages[0].bookPageAvailable, true);
  assert.deepEqual(LESSON_FIFTEEN_PART_ONE.grammarPages[0].printedPages, [347, 348]);
  assert.equal(LESSON_FIFTEEN_PART_TWO.grammarPages[0].bookPageAvailable, true);
  assert.deepEqual(LESSON_FIFTEEN_PART_TWO.grammarPages[0].printedPages, [354]);
  assert.equal(LESSON_FIFTEEN_PART_THREE.grammarPages[0].bookPageAvailable, true);
  assert.deepEqual(LESSON_FIFTEEN_PART_THREE.grammarPages[0].printedPages, [349]);
});

test('Lesson 16 Parts 1 and 2 have exported textbook page assets', () => {
  assert.equal(LESSON_SIXTEEN_PART_ONE.grammarPages[0].bookPageAvailable, true);
  assert.deepEqual(LESSON_SIXTEEN_PART_ONE.grammarPages[0].printedPages, [373, 374]);
  assert.equal(LESSON_SIXTEEN_PART_TWO.grammarPages[0].bookPageAvailable, true);
  assert.deepEqual(LESSON_SIXTEEN_PART_TWO.grammarPages[0].printedPages, [383]);
  assert.equal(LESSON_SIXTEEN_PART_TWO.grammarPages[1].bookPageAvailable, true);
  assert.deepEqual(LESSON_SIXTEEN_PART_TWO.grammarPages[1].printedPages, [385]);
  assert.equal(LESSON_SIXTEEN_PART_TWO.grammarPages[2].bookPageAvailable, true);
  assert.deepEqual(LESSON_SIXTEEN_PART_TWO.grammarPages[2].printedPages, [387]);
  assert.equal(LESSON_SIXTEEN_PART_TWO.grammarPages[3].bookPageAvailable, true);
  assert.deepEqual(LESSON_SIXTEEN_PART_TWO.grammarPages[3].printedPages, [389]);
});


