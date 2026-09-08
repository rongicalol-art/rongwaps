import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_TEN_PART_ONE,
  LESSON_TEN_PART_TWO,
} from '../src/data/grammar/lessonTen';
import {
  LESSON_ELEVEN_PART_ONE,
  LESSON_ELEVEN_PART_TWO,
} from '../src/data/grammar/lessonEleven';
import {
  LESSON_TWELVE_PART_ONE,
  LESSON_TWELVE_PART_TWO,
} from '../src/data/grammar/lessonTwelve';
import {
  LESSON_THIRTEEN_PART_ONE,
  LESSON_THIRTEEN_PART_TWO,
} from '../src/data/grammar/lessonThirteen';
import {
  LESSON_FOURTEEN_PART_ONE,
  LESSON_FOURTEEN_PART_TWO,
} from '../src/data/grammar/lessonFourteen';
import type { InteractiveGrammarPart } from '../src/types/models';
import { evaluateGrammarPlacements, findCanonicalTile } from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessons: Array<{
  lessonId: number;
  parts: InteractiveGrammarPart[];
  partSizes: number[];
  firstPrintedPages: number[];
  worldKind: string;
}> = [
  {
    lessonId: 10,
    parts: [LESSON_TEN_PART_ONE, LESSON_TEN_PART_TWO],
    partSizes: [3, 2],
    firstPrintedPages: [226, 228, 231, 236, 237],
    worldKind: 'care',
  },
  {
    lessonId: 11,
    parts: [LESSON_ELEVEN_PART_ONE, LESSON_ELEVEN_PART_TWO],
    partSizes: [3, 2],
    firstPrintedPages: [247, 249, 251, 257, 259],
    worldKind: 'chat',
  },
  {
    lessonId: 12,
    parts: [LESSON_TWELVE_PART_ONE, LESSON_TWELVE_PART_TWO],
    partSizes: [3, 2],
    firstPrintedPages: [271, 272, 281, 282, 284],
    worldKind: 'career',
  },
  {
    lessonId: 13,
    parts: [LESSON_THIRTEEN_PART_ONE, LESSON_THIRTEEN_PART_TWO],
    partSizes: [3, 2],
    firstPrintedPages: [295, 296, 297, 303, 304],
    worldKind: 'route',
  },
  {
    lessonId: 14,
    parts: [LESSON_FOURTEEN_PART_ONE, LESSON_FOURTEEN_PART_TWO],
    partSizes: [2, 1],
    firstPrintedPages: [319, 322, 331],
    worldKind: 'countdown',
  },
];

test('Lessons 10–14 preserve their source order and reading-centered parts', () => {
  lessons.forEach(({ lessonId, parts, partSizes, firstPrintedPages }) => {
    const pages = parts.flatMap((part) => part.grammarPages);

    assert.deepEqual(parts.map((part) => part.partId), [1, 2], `Lesson ${lessonId} part order`);
    assert.deepEqual(parts.map((part) => part.grammarPages.length), partSizes, `Lesson ${lessonId} part sizes`);
    assert.deepEqual(
      pages.map((page) => page.grammarNumber),
      pages.map((_, index) => index + 1),
      `Lesson ${lessonId} grammar order`,
    );
    assert.deepEqual(
      pages.map((page) => page.printedPages[0]),
      firstPrintedPages,
      `Lesson ${lessonId} source pages`,
    );
    assert.ok(parts.every((part) => part.dialogue.lines.length > 0), `Lesson ${lessonId} source readings`);
  });
});

test('Every grammar page has beginner support, varied examples, and practice', () => {
  lessons.forEach(({ lessonId, parts, worldKind }) => {
    parts.flatMap((part) => part.grammarPages).forEach((page) => {
      assert.equal(page.lessonWorld?.kind, worldKind, `${page.id} teaching world`);
      assert.ok(page.learnerPromise.length > 0, `${page.id} learner promise`);
      assert.ok(page.explanation.length > 0, `${page.id} explanation`);
      assert.ok(page.examples.length >= 3, `${page.id} needs at least three examples`);
      assert.ok(page.questions.length >= 3, `${page.id} needs at least three practice questions`);
      assert.ok(page.teachingGlossary.length > 0, `${page.id} teaching glossary`);
      assert.equal(page.lessonId, lessonId, `${page.id} lesson registration`);
    });
  });
});

test('The hardest lesson ideas get purpose-built visual tools', () => {
  const lessonThirteenPages = [
    ...LESSON_THIRTEEN_PART_ONE.grammarPages,
    ...LESSON_THIRTEEN_PART_TWO.grammarPages,
  ];
  const lessonFourteenPages = [
    ...LESSON_FOURTEEN_PART_ONE.grammarPages,
    ...LESSON_FOURTEEN_PART_TWO.grammarPages,
  ];

  assert.ok(lessonThirteenPages[1].routeLab, 'Lesson 13 direction grammar needs its route lab');
  assert.ok(lessonFourteenPages[0].timelineLab, 'Lesson 14 one-了 grammar needs its finished timeline');
  assert.ok(lessonFourteenPages[1].timelineLab, 'Lesson 14 double-了 grammar needs its continuing timeline');
  assert.ok(lessonFourteenPages[2].pairCompareLab, 'Lesson 14 比 grammar needs its A/B comparison lab');
});

test('Every Lessons 10–14 grammar completes with its canonical authored answers', () => {
  lessons.flatMap(({ parts }) => parts).flatMap((part) => part.grammarPages).forEach((page) => {
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

test('Lessons 10–14 keep the complete interactive content registry valid', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});

test('Lesson 11 Grammar 3 and Lesson 13 Grammar 2 faithfully match textbook source scans', () => {
  const l11p1g3 = LESSON_ELEVEN_PART_ONE.grammarPages[2];
  assert.equal(l11p1g3.id, 'B1L11-G03-P251');
  assert.equal(l11p1g3.examples.length, 5, 'L11 G3 should have 5 authentic textbook examples');
  assert.ok(l11p1g3.examples[0].text.traditional.startsWith('A: 他已經到學校了。'), 'L11 G3 example 1 matches scan');
  assert.ok(l11p1g3.examples[1].text.traditional.startsWith('A: 張先生來了。'), 'L11 G3 example 2 matches scan');
  assert.ok(l11p1g3.examples[2].text.traditional.startsWith('A: 你的中文說得真好'), 'L11 G3 example 3 matches scan');
  assert.ok(l11p1g3.examples[3].text.traditional.startsWith('A: 你知道她的手機號碼嗎？'), 'L11 G3 example 4 matches scan');
  assert.equal(l11p1g3.examples[4].text.traditional, '他是昨天晚上到的，不是今天早上到的。', 'L11 G3 example 5 matches scan');

  const l13p1 = LESSON_THIRTEEN_PART_ONE.grammarPages[1];
  assert.equal(l13p1.id, 'B1L13-G02-P296');
  assert.equal(l13p1.examples.length, 3, 'L13 G2 should have 3 authentic textbook examples');
  assert.equal(l13p1.examples[0].text.traditional, '中國字應該從左往右寫，韓國字呢？', 'L13 G2 example 1 matches scan');
});

