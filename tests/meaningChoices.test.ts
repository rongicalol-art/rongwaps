import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMeaningChoices,
  buildAttributeChoices,
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

