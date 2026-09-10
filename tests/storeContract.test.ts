import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCOUNT_SWITCH_DEFAULTS,
  PERSISTED_KEYS,
  useAppStore,
} from '../src/store/useAppStore';
import { createEmptySessionProgress } from '../src/utils/reviewProgress';

/**
 * The store's persistence contract. The legacy store persisted exactly these
 * keys under 'rongwaps-storage'; this test fails if a slice key gains or
 * loses persistence silently.
 */
const LEGACY_PERSISTED_KEYS = [
  'lastActiveUserId',
  'activeBookId',
  'characterPreference',
  'favorites',
  'srsData',
  'learnedCards',
  'sessionProgressIndex',
  'deckExclusions',
  'activeTab',
  'activeActivity',
  'activeQuizMode',
  'isReviewMode',
  'selectedLessons',
  'selectedBooks',
  'selectedLessonParts',
  'customFolders',
  'deletedFolderIds',
  'foldersSyncedUserId',
  'libraryActiveFolder',
  'localFlashcards',
].sort();

test('persisted key set matches the legacy persisted state exactly', () => {
  assert.deepEqual([...PERSISTED_KEYS].sort(), LEGACY_PERSISTED_KEYS);
});

/**
 * The account-switch reset contract. Exactly this state was cleared by the
 * hand-written reset in useCloudSync; a key added here without a
 * corresponding reset (or vice versa) leaks across accounts.
 */
const LEGACY_ACCOUNT_SWITCH_KEYS = [
  'srsData',
  'learnedCards',
  'favorites',
  'customFolders',
  'deletedFolderIds',
  'foldersSyncedUserId',
  'sessionProgress',
  'sessionProgressIndex',
  'selectedLessonParts',
  'selectedLessons',
  'selectedBooks',
  'activeActivity',
  'lastActivity',
  'lastCloudUpdate',
].sort();

test('account-switch defaults match the legacy reset contract exactly', () => {
  assert.deepEqual(Object.keys(ACCOUNT_SWITCH_DEFAULTS).sort(), LEGACY_ACCOUNT_SWITCH_KEYS);
  assert.deepEqual(ACCOUNT_SWITCH_DEFAULTS.sessionProgress, createEmptySessionProgress());
});

test('resetAccountScopedState clears account-scoped state and nothing else', () => {
  const store = useAppStore;

  // Simulate a signed-in user's state.
  store.setState({
    srsData: { card_a: { cardId: 'card_a', interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: 0 } },
    learnedCards: ['card_a'],
    favorites: ['word_你好'],
    customFolders: [{ id: 'f1', name: 'Mine', color: 'blue' }],
    deletedFolderIds: ['f2'],
    foldersSyncedUserId: 'user-a',
    sessionProgress: { startTime: 1, cardsReviewed: 5, cardsLearned: 2 },
    sessionProgressIndex: { key: 3 },
    selectedLessonParts: { '1:2': [1] },
    selectedLessons: [2],
    selectedBooks: [1],
    activeActivity: 'quiz',
    lastActivity: 'quiz',
    lastCloudUpdate: '2026-01-01T00:00:00.000Z',
    // Account-agnostic state that must survive the switch:
    activeTab: 'library',
    activeBookId: 1,
    characterPreference: 'simplified',
    isReviewMode: true,
    localFlashcards: [],
    lastActiveUserId: 'user-a',
  });

  store.getState().resetAccountScopedState();

  const state = store.getState();
  assert.deepEqual(state.srsData, {});
  assert.deepEqual(state.learnedCards, []);
  assert.deepEqual(state.favorites, []);
  assert.deepEqual(state.customFolders, []);
  assert.deepEqual(state.deletedFolderIds, []);
  assert.equal(state.foldersSyncedUserId, null);
  assert.deepEqual(state.sessionProgress, createEmptySessionProgress());
  assert.deepEqual(state.sessionProgressIndex, {});
  assert.deepEqual(state.selectedLessonParts, {});
  assert.deepEqual(state.selectedLessons, []);
  assert.deepEqual(state.selectedBooks, []);
  assert.equal(state.activeActivity, null);
  assert.equal(state.lastActivity, null);
  assert.equal(state.lastCloudUpdate, null);

  // Account-agnostic state survives.
  assert.equal(state.activeTab, 'library');
  assert.equal(state.activeBookId, 1);
  assert.equal(state.characterPreference, 'simplified');
  assert.equal(state.isReviewMode, true);
  assert.equal(state.lastActiveUserId, 'user-a');
});
