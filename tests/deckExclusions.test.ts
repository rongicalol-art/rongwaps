import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Flashcard } from '../src/data/flashcards';
import {
  filterDeckByExclusions,
  isCardIdExcluded,
  pruneExcludedIds,
} from '../src/utils/deckExclusions';
import { getDeckIdentityKey } from '../src/utils/lessonPartSelection';
import { useAppStore } from '../src/store/useAppStore';

function card(id: string): Flashcard {
  return {
    id,
    bookId: 1,
    lessonId: 1,
    front: id,
    back: id,
  };
}

const EMPTY_PARTS = {};

test('curriculum deck key includes book, lessons, and part fingerprint', () => {
  const key = getDeckIdentityKey({
    activeBookId: 2,
    selectedLessons: [3, 4],
    selectedLessonParts: { '2:3': [1], '2:4': 'all' },
    libraryActiveFolder: 'all',
    isReviewDeck: false,
    isLibraryDeck: false,
  });
  assert.equal(key, 'shared_deck_2_3:1,4:all');
});

test('review deck key is global (not book-scoped)', () => {
  const key1 = getDeckIdentityKey({
    activeBookId: 1,
    selectedLessons: [],
    selectedLessonParts: EMPTY_PARTS,
    libraryActiveFolder: 'all',
    isReviewDeck: true,
    isLibraryDeck: false,
  });
  const key2 = getDeckIdentityKey({
    activeBookId: 7,
    selectedLessons: [],
    selectedLessonParts: EMPTY_PARTS,
    libraryActiveFolder: 'all',
    isReviewDeck: true,
    isLibraryDeck: false,
  });
  assert.equal(key1, 'shared_deck_review');
  assert.equal(key2, 'shared_deck_review');
});

test('library deck key is folder-scoped', () => {
  const key = getDeckIdentityKey({
    activeBookId: 1,
    selectedLessons: [],
    selectedLessonParts: EMPTY_PARTS,
    libraryActiveFolder: 'folder-abc',
    isReviewDeck: false,
    isLibraryDeck: true,
  });
  assert.equal(key, 'shared_deck_library_folder-abc');
});

test('filterDeckByExclusions removes excluded ids and keeps order', () => {
  const cards = [card('a'), card('b'), card('c')];
  const filtered = filterDeckByExclusions(cards, new Set(['b']));
  assert.deepEqual(filtered.map((c) => c.id), ['a', 'c']);
});

test('filterDeckByExclusions with empty excluded set returns same reference', () => {
  const cards = [card('a')];
  assert.equal(filterDeckByExclusions(cards, new Set()), cards);
});

test('filterDeckByExclusions removes all cards when every card is excluded', () => {
  const cards = [card('a'), card('b')];
  assert.deepEqual(filterDeckByExclusions(cards, new Set(['a', 'b'])), []);
});

test('pruneExcludedIds keeps known ids and drops stale ones', () => {
  const pruned = pruneExcludedIds(['a', 'b', 'stale'], new Set(['a', 'stale']));
  assert.deepEqual(pruned, ['a', 'stale']);
});

test('pruneExcludedIds with empty list returns the same reference', () => {
  const empty: string[] = [];
  assert.equal(pruneExcludedIds(empty, new Set()), empty);
});

test('excluded cards already removed return empty array (full prune to empty)', () => {
  const pruned = pruneExcludedIds(['gone'], new Set());
  assert.deepEqual(pruned, []);
});

test('isCardIdExcluded', () => {
  const excluded = new Set(['b']);
  assert.equal(isCardIdExcluded(excluded, 'b'), true);
  assert.equal(isCardIdExcluded(excluded, 'a'), false);
});

test('clearDeckExclusions removes all exclusions for specified deck key', () => {
  const store = useAppStore;
  const key = 'shared_deck_test_clear';
  store.getState().setDeckExclusions(key, ['card-1', 'card-2']);
  assert.deepEqual(store.getState().deckExclusions[key], ['card-1', 'card-2']);
  store.getState().clearDeckExclusions(key);
  assert.equal(store.getState().deckExclusions[key], undefined);
});
