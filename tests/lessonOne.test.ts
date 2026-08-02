import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LESSON_ONE_PART_ONE,
  LESSON_ONE_PART_TWO,
} from '../src/data/interactiveGrammarPages';
import {
  evaluateGrammarPlacements,
  findCanonicalTile,
} from '../src/utils/grammarExercise';
import {
  continueGrammarLesson,
  selectGrammar,
  selectGrammarMode,
} from '../src/utils/grammarLessonFlow';
import {
  appendUniqueId,
  getGrammarPathStatus,
  getReadingPathStatus,
} from '../src/utils/lessonProgress';

const lessonOneParts = [LESSON_ONE_PART_ONE, LESSON_ONE_PART_TWO];
const lessonOnePages = lessonOneParts.flatMap((part) => part.grammarPages);

test('Lesson 1 covers five ordered grammar points in two source-reading parts', () => {
  assert.deepEqual(lessonOnePages.map((page) => page.grammarNumber), [1, 2, 3, 4, 5]);
  assert.equal(new Set(lessonOnePages.map((page) => page.id)).size, 5);
  assert.ok(lessonOnePages.every((page) => page.learnerPromise.trim()));
  assert.ok(lessonOnePages.every((page) => page.titleTraditional.trim()));
});

test('Every Lesson 1 grammar exercise completes with its canonical authored answers', () => {
  lessonOnePages.forEach((page) => {
    const placements: Record<string, string> = {};
    page.questions.forEach((question) => {
      question.segments.forEach((segment) => {
        if (segment.type !== 'blank') return;
        const tile = findCanonicalTile(question, segment.answer, segment.answerSimplified);
        assert.ok(tile, `${page.id} ${segment.id} needs a canonical answer tile`);
        placements[segment.id] = tile.id;
      });
    });
    const evaluation = evaluateGrammarPlacements(page.questions, placements);
    assert.equal(evaluation.complete, true, `${page.id} canonical flow must complete`);
    assert.equal(evaluation.wrongBlankIds.length, 0);
  });
});

test('Grammar navigation returns to Learn and completion waits for every grammar', () => {
  assert.deepEqual(selectGrammar(2), { grammarIndex: 2, view: 'study' });
  assert.deepEqual(selectGrammarMode(1, 'exercise'), { grammarIndex: 1, view: 'exercise' });
  assert.deepEqual(continueGrammarLesson({
    grammarIndex: 0,
    grammarCount: 3,
    allGrammarComplete: false,
    firstIncompleteIndex: 1,
  }), { grammarIndex: 1, view: 'study' });
  assert.deepEqual(continueGrammarLesson({
    grammarIndex: 2,
    grammarCount: 3,
    allGrammarComplete: false,
    firstIncompleteIndex: 0,
  }), { grammarIndex: 0, view: 'study' });
  assert.deepEqual(continueGrammarLesson({
    grammarIndex: 2,
    grammarCount: 3,
    allGrammarComplete: true,
    firstIncompleteIndex: -1,
  }), { grammarIndex: 2, view: 'complete' });
});

test('Persisted progress remains duplicate-safe and exposes path states', () => {
  assert.deepEqual(appendUniqueId(['one'], 'one'), ['one']);
  assert.deepEqual(appendUniqueId(['one'], 'two'), ['one', 'two']);
  assert.equal(getGrammarPathStatus(LESSON_ONE_PART_ONE, [], [], []), 'not-started');
  assert.equal(getGrammarPathStatus(
    LESSON_ONE_PART_ONE,
    [LESSON_ONE_PART_ONE.id],
    [],
    [],
  ), 'in-progress');
  assert.equal(getGrammarPathStatus(
    LESSON_ONE_PART_ONE,
    [],
    [],
    [LESSON_ONE_PART_ONE.id],
  ), 'completed');
  assert.equal(getReadingPathStatus('reading', ['reading'], []), 'in-progress');
  assert.equal(getReadingPathStatus('reading', [], ['reading']), 'completed');
});
