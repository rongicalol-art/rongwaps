import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPracticeLoadingMessage } from '../src/utils/practiceLoader';
import {
  getCachedActivityDeck,
  setCachedActivityDeck,
  clearActivityDeckCache,
} from '../src/hooks/useActivityDataLoader';
import type { Flashcard } from '../src/data/flashcards';

test('getPracticeLoadingMessage returns correct messages for each mode', () => {
  assert.equal(getPracticeLoadingMessage('flashcards', false, false), 'Loading lesson…');
  assert.equal(getPracticeLoadingMessage('quiz', false, false), 'Loading lesson…');
  assert.equal(getPracticeLoadingMessage('listening', false, false), 'Loading lesson…');
  assert.equal(getPracticeLoadingMessage('writing', false, false), 'Loading lesson…');

  assert.equal(getPracticeLoadingMessage('flashcards-review', false, false), 'Loading review…');
  assert.equal(getPracticeLoadingMessage('flashcards', true, false), 'Loading review…');

  assert.equal(getPracticeLoadingMessage('flashcards-library', false, false), 'Loading deck…');
  assert.equal(getPracticeLoadingMessage('flashcards', false, true), 'Loading deck…');
});

test('activityDeckCache stores, retrieves, and clears decks correctly', () => {
  clearActivityDeckCache();
  const testKey = 'test_deck_1';
  assert.equal(getCachedActivityDeck(testKey), undefined);

  const mockCards: Flashcard[] = [
    { id: 'card-1', bookId: 1, lessonId: 1, front: '你好', back: 'hello' },
  ];

  setCachedActivityDeck(testKey, { cards: mockCards, knownIds: new Set(['card-1']) });
  const cached = getCachedActivityDeck(testKey);
  assert.ok(cached);
  assert.equal(cached.cards.length, 1);
  assert.equal(cached.cards[0].id, 'card-1');

  clearActivityDeckCache();
  assert.equal(getCachedActivityDeck(testKey), undefined);
});
