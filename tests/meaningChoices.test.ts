import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMeaningChoices,
  normalizeMeaning,
} from '../src/utils/meaningChoices';

const cards = [
  { id: 'correct', back: "o'clock" },
  { id: 'duplicate-exact', back: "o'clock" },
  { id: 'duplicate-formatting', back: "  O'CLOCK  " },
  { id: 'morning', back: 'morning' },
  { id: 'evening', back: 'evening' },
  { id: 'night', back: 'night' },
];

test('meaning choices exclude duplicate distractor meanings', () => {
  const result = buildMeaningChoices(cards[0], cards);

  assert.deepEqual(
    result.map((choice) => choice.id),
    ['correct', 'morning', 'evening'],
  );
  assert.equal(
    new Set(result.map((choice) => normalizeMeaning(choice.back))).size,
    result.length,
  );
});

test('meaning choice construction is pure and respects the requested limit', () => {
  const originalIds = cards.map((card) => card.id);

  assert.deepEqual(
    buildMeaningChoices(cards[0], cards, 2).map((choice) => choice.id),
    ['correct', 'morning'],
  );
  assert.deepEqual(cards.map((card) => card.id), originalIds);
  assert.deepEqual(buildMeaningChoices(cards[0], cards, 0), []);
});
