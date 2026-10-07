import assert from 'node:assert/strict';
import test from 'node:test';
import { reorderSessionOnShuffle } from '../../src/utils/srs/sessionOrder';

interface MockCard {
  id: string;
}

const card = (id: string): MockCard => ({ id });

test('reorderSessionOnShuffle: empty or single card deck is unchanged', () => {
  const resultEmpty = reorderSessionOnShuffle({
    currentCards: [],
    canonicalCards: [],
    currentIndex: 0,
    nextShuffled: true,
    hasAnsweredCards: false,
  });
  assert.deepEqual(resultEmpty, []);

  const single = [card('c1')];
  const resultSingle = reorderSessionOnShuffle({
    currentCards: single,
    canonicalCards: single,
    currentIndex: 0,
    nextShuffled: true,
    hasAnsweredCards: false,
  });
  assert.deepEqual(resultSingle, single);
});

test('reorderSessionOnShuffle: at session start with no answered cards, shuffles full deck', () => {
  const canonical = [card('c1'), card('c2'), card('c3'), card('c4'), card('c5')];
  const result = reorderSessionOnShuffle({
    currentCards: canonical,
    canonicalCards: canonical,
    currentIndex: 0,
    nextShuffled: true,
    hasAnsweredCards: false,
  });

  assert.equal(result.length, 5);
  // All cards are present
  const resultIds = new Set(result.map((c) => c.id));
  assert.equal(resultIds.size, 5);
  for (const c of canonical) {
    assert.ok(resultIds.has(c.id));
  }
});

test('reorderSessionOnShuffle: mid-session preserves completed and current cards, shuffles upcoming only', () => {
  const canonical = [card('c1'), card('c2'), card('c3'), card('c4'), card('c5'), card('c6')];
  // User is on card c4 (currentIndex = 3), cards c1, c2, c3 are already completed
  const currentCards = [...canonical];

  const result = reorderSessionOnShuffle({
    currentCards,
    canonicalCards: canonical,
    currentIndex: 3,
    nextShuffled: true,
    hasAnsweredCards: true,
  });

  assert.equal(result.length, 6);
  // Completed cards (0..2) and current card (3) MUST remain identical
  assert.equal(result[0].id, 'c1');
  assert.equal(result[1].id, 'c2');
  assert.equal(result[2].id, 'c3');
  assert.equal(result[3].id, 'c4');

  // Upcoming cards (4..5) contain c5 and c6
  const upcomingIds = new Set([result[4].id, result[5].id]);
  assert.ok(upcomingIds.has('c5'));
  assert.ok(upcomingIds.has('c6'));
});

test('reorderSessionOnShuffle: toggling shuffle off restores full deck to canonical order', () => {
  const canonical = [card('c1'), card('c2'), card('c3'), card('c4'), card('c5'), card('c6')];
  // Active cards are completely shuffled
  const currentCards = [card('c5'), card('c2'), card('c6'), card('c1'), card('c4'), card('c3')];

  const result = reorderSessionOnShuffle({
    currentCards,
    canonicalCards: canonical,
    currentIndex: 2,
    nextShuffled: false,
    hasAnsweredCards: true,
  });

  // Toggling shuffle off restores the entire deck to canonical order
  assert.deepEqual(result, canonical);
});

