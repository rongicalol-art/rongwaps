import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAttributeChoices,
  normalizeMeaning,
} from '../../src/utils/vocabulary/meaningChoices';

const cards = [
  { id: 'correct', front: '點', back: "o'clock" },
  { id: 'duplicate-exact', front: '點鐘', back: "o'clock" },
  { id: 'duplicate-formatting', front: '整點', back: "  O'CLOCK  " },
  { id: 'morning', front: '早上', back: 'morning' },
  { id: 'evening', front: '晚上', back: 'evening' },
  { id: 'night', front: '半夜', back: 'night' },
];

test('meaning choices exclude duplicate distractor meanings', () => {
  const result = buildAttributeChoices(cards[0], cards, 'meaning');

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
    buildAttributeChoices(cards[0], cards, 'meaning', 2).map((choice) => choice.id),
    ['correct', 'morning'],
  );
  assert.deepEqual(cards.map((card) => card.id), originalIds);
  assert.deepEqual(buildAttributeChoices(cards[0], cards, 'meaning', 0), []);
});

test('buildAttributeChoices builds distinct choices for hanzi, pinyin, and meaning', () => {
  const multiCards = [
    { id: '1', front: '你好', pinyin: 'nǐ hǎo', back: 'hello' },
    { id: '2', front: '您好', pinyin: 'nín hǎo', back: 'hello (formal)' },
    { id: '3', front: '早安', pinyin: 'zǎo ān', back: 'good morning' },
    { id: '4', front: '晚安', pinyin: 'wǎn ān', back: 'good night' },
  ];

  // Hanzi choices
  const hanziChoices = buildAttributeChoices(multiCards[0], multiCards, 'hanzi', 3);
  assert.equal(hanziChoices.length, 3);
  assert.equal(hanziChoices[0].front, '你好');

  // Pinyin choices
  const pinyinChoices = buildAttributeChoices(multiCards[0], multiCards, 'pinyin', 3);
  assert.equal(pinyinChoices.length, 3);
  assert.equal(pinyinChoices[0].pinyin, 'nǐ hǎo');

  // Meaning choices
  const meaningChoices = buildAttributeChoices(multiCards[0], multiCards, 'meaning', 3);
  assert.equal(meaningChoices.length, 3);
  assert.equal(meaningChoices[0].back, 'hello');
});

