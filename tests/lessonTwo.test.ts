import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_TWO_PART_ONE } from '../src/data/grammar/lessonTwoPartOne';
import { LESSON_TWO_PART_TWO } from '../src/data/grammar/lessonTwoPartTwo';
import { getReadingsForLesson } from '../src/data/readings';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const lessonTwoPages = [
  ...LESSON_TWO_PART_ONE.grammarPages,
  ...LESSON_TWO_PART_TWO.grammarPages,
];

test('Lesson 2 has six ordered grammar points and all 18 source prompts', () => {
  assert.deepEqual(lessonTwoPages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5, 6]);
  assert.equal(lessonTwoPages.reduce((count, page) => count + page.questions.length, 0), 18);
  assert.ok(lessonTwoPages.every((page) => page.examples.length === 3));
  assert.ok(lessonTwoPages.every((page) => page.learnerPromise.trim()));
});

test('Every Lesson 2 grammar completes with canonical authored answers', () => {
  lessonTwoPages.forEach((page) => {
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

test('Lesson 2 wrong placements cannot complete a grammar', () => {
  const page = lessonTwoPages[0];
  const placements: Record<string, string> = {};
  page.questions.forEach((question) => {
    question.segments.forEach((segment) => {
      if (segment.type !== 'blank') return;
      const wrongTile = question.tiles.find((tile) => (
        tile.traditional !== segment.answer
        && tile.simplified !== segment.answerSimplified
        && !(segment.acceptedAnswers ?? []).includes(tile.traditional)
        && !(segment.acceptedAnswersSimplified ?? []).includes(tile.simplified ?? '')
      ));
      assert.ok(wrongTile, `${segment.id} needs a distractor`);
      placements[segment.id] = wrongTile.id;
    });
  });
  assert.equal(evaluateGrammarPlacements(page.questions, placements).complete, false);
});

test('Lesson 2 derives two complete dialogue readings', () => {
  const readings = getReadingsForLesson(1, 2);
  assert.deepEqual(readings.map((reading) => reading.dialogueNumber), [1, 2]);
  readings.forEach((reading) => {
    assert.ok(reading.paragraphs.length > 0, `${reading.id} needs paragraphs`);
    reading.paragraphs.forEach((paragraph) => {
      assert.ok(paragraph.speaker.trim(), `${reading.id} needs a speaker`);
      assert.ok(paragraph.traditional.trim() && paragraph.simplified.trim());
      assert.ok(paragraph.pinyin.trim() && paragraph.english.trim());
    });
  });
});

test('All interactive lesson registries pass production content validation', () => {
  assert.deepEqual(validateInteractiveLessons(), []);
});
