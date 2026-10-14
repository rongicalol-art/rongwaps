import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { getPracticeLoadingMessage, preloadRemainingPracticeChunks } from '../../src/utils/practiceLoader';
import {
  getCachedActivityDeck,
  setCachedActivityDeck,
  clearActivityDeckCache,
} from '../../src/hooks/useActivityDataLoader';
import type { Flashcard } from '../../src/data/flashcards';

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

import { loadActivityDeck } from '../../src/hooks/useActivityDataLoader';
import { useAppStore } from '../../src/store/useAppStore';
import { audioService } from '../../src/services/audioService';
import { fetchAllVocabularyPacks } from '../../src/services/contentPacks';
import { prepareVocabulary } from '../../src/services/vocabularyService';
import { loadReviewDeck } from '../../src/services/activityDeckFetcher';
import { getDeckIdentityKey, SHARED_REVIEW_SESSION_KEY } from '../../src/utils/lesson/lessonPartSelection';

function isolateDeckState(t: TestContext) {
  const original = useAppStore.getState();
  clearActivityDeckCache();
  useAppStore.setState({ currentUser: null, selectedLessonParts: {}, deckExclusions: {}, activeReviewSessionCards: null, srsData: {} });
  t.mock.method(audioService, 'preload', async () => {});
  t.mock.method(audioService, 'preloadNeural', async () => {});
  t.after(() => { clearActivityDeckCache(); useAppStore.setState(original); });
}

test('modal, screen and prefetch share one prepared curriculum deck and current exclusions', async (t) => {
  isolateDeckState(t);
  const intent = { activeBookId: 1, selectedLessons: [1] };
  const [modal, screen] = await Promise.all([loadActivityDeck(intent), loadActivityDeck(intent)]);
  assert.ok(modal.cards.length > 0);
  assert.strictEqual(modal.deckCards, screen.deckCards);
  const key = getDeckIdentityKey({ ...intent, selectedLessonParts: {}, libraryActiveFolder: 'custom', isReviewDeck: false, isLibraryDeck: false });
  useAppStore.setState({ deckExclusions: { [key]: [modal.cards[0].id] } });
  const prefetched = await loadActivityDeck(intent);
  assert.strictEqual(prefetched.deckCards, modal.deckCards);
  assert.equal(prefetched.cards.length, modal.cards.length - 1);
  assert.ok(!prefetched.cards.some((card) => card.id === modal.cards[0].id));
});

test('review row filtering preserves the original prepared cards and complete known-id set', async () => {
  const rows = await fetchAllVocabularyPacks();
  assert.ok(rows && rows.length > 2);
  const ids = [String(rows[0].id), String(rows[2].id), 'missing-course-word'];
  const result = await loadReviewDeck({}, ids);
  assert.deepEqual(result.cards, prepareVocabulary(rows).filter((card) => ids.includes(card.id)));
  assert.deepEqual(result.knownIds, new Set(rows.map((row) => String(row.id))));
});

test('a changed pinned review replaces the cached pool and concurrent opens share it', async (t) => {
  isolateDeckState(t);
  const rows = await fetchAllVocabularyPacks();
  assert.ok(rows && rows.length > 1);
  const intent = { activeBookId: 1, selectedLessons: [], isReviewDeck: true };
  useAppStore.setState({ activeReviewSessionCards: [String(rows[0].id)] });
  const initial = await loadActivityDeck(intent);
  assert.deepEqual(initial.cards.map((card) => card.id), [String(rows[0].id)]);
  useAppStore.setState({ activeReviewSessionCards: [String(rows[1].id)] });
  const [a, b] = await Promise.all([loadActivityDeck(intent), loadActivityDeck(intent)]);
  assert.deepEqual(a.cards.map((card) => card.id), [String(rows[1].id)]);
  assert.strictEqual(a.deckCards, b.deckCards);
});

test('clearing an in-flight review cannot repopulate the cache or pin a session', async (t) => {
  isolateDeckState(t);
  const task = loadActivityDeck({ activeBookId: 1, selectedLessons: [], isReviewDeck: true });
  clearActivityDeckCache();
  await task;
  assert.equal(getCachedActivityDeck(SHARED_REVIEW_SESSION_KEY), undefined);
  assert.equal(useAppStore.getState().activeReviewSessionCards, null);
});

test('an account switch discards an old in-flight deck and isolates new cache entries', async (t) => {
  isolateDeckState(t);
  const intent = { activeBookId: 1, selectedLessons: [], isReviewDeck: true };
  useAppStore.setState({ currentUser: { id: 'fixture-a' } });
  const old = loadActivityDeck(intent);
  useAppStore.setState({ currentUser: { id: 'fixture-b' } });
  const [fresh, duplicate] = await Promise.all([loadActivityDeck(intent), loadActivityDeck(intent)]);
  await old;
  assert.strictEqual(fresh.deckCards, duplicate.deckCards);
  assert.ok(getCachedActivityDeck(SHARED_REVIEW_SESSION_KEY));
  useAppStore.setState({ currentUser: { id: 'fixture-a' } });
  assert.equal(getCachedActivityDeck(SHARED_REVIEW_SESSION_KEY), undefined);
});

test('focused quiz schedules no other modes and closing flashcards cancels its idle prefetch', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const queued = new Map<number, () => void>();
  let id = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    requestIdleCallback: (run: () => void) => { queued.set(++id, run); return id; },
    cancelIdleCallback: (key: number) => { queued.delete(key); },
  } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  assert.equal(preloadRemainingPracticeChunks('quiz', false), undefined);
  assert.equal(queued.size, 0);
  const cancel = preloadRemainingPracticeChunks('flashcards', false);
  assert.ok(cancel);
  assert.equal(queued.size, 1);
  cancel();
  assert.equal(queued.size, 0);
});
