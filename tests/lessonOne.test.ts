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
  buildGrammarPartSegments,
  continueGrammarLesson,
  selectGrammar,
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

test('Grammar flow is a linear grammar -> next grammar path', () => {
  const allPageIds = ['g1', 'g2', 'g3'];
  const continueAfter = (
    grammarIndex: number,
    pageId: string,
    completedPageIds: string[],
  ) => continueGrammarLesson({
    grammarIndex,
    grammarCount: 3,
    pageId,
    completedPageIds,
    allPageIds,
  });

  assert.deepEqual(selectGrammar(2), { grammarIndex: 2 });
  assert.deepEqual(continueAfter(0, 'g1', []), { grammarIndex: 1 });
  assert.deepEqual(continueAfter(1, 'g2', ['g1']), { grammarIndex: 2 });
  assert.deepEqual(continueAfter(2, 'g3', ['g1', 'g2', 'g3']), { grammarIndex: 2, isPartComplete: true });
});

test('Final grammar completes the part even when the completed set is stale during the click', () => {
  const allPageIds = ['g1', 'g2', 'g3'];
  const completedBeforeRender = ['g1', 'g2'];
  assert.deepEqual(continueGrammarLesson({
    grammarIndex: 2,
    grammarCount: 3,
    pageId: 'g3',
    completedPageIds: completedBeforeRender,
    allPageIds,
  }), { grammarIndex: 2, isPartComplete: true });
});

test('Continue advances to the first grammar not in the post-completion set', () => {
  const allPageIds = ['g1', 'g2', 'g3'];
  assert.deepEqual(continueGrammarLesson({
    grammarIndex: 2,
    grammarCount: 3,
    pageId: 'g3',
    completedPageIds: ['g1'],
    allPageIds,
  }), { grammarIndex: 1 });
});

test('Grammar part builds one progress segment per grammar point', () => {
  const segments = buildGrammarPartSegments(LESSON_ONE_PART_ONE);
  assert.equal(segments.length, LESSON_ONE_PART_ONE.grammarPages.length);
  segments.forEach((segment, index) => {
    assert.equal(segment.cardCount, 1);
    assert.equal(segment.startIndex, index);
    assert.equal(segment.partId, index + 1);
  });
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
