import test from 'node:test';
import assert from 'node:assert/strict';
import { pickPracticeSuggestion } from '../../src/screens/activities/practiceModes';

const NOW = Date.UTC(2026, 10, 23);
const DAY = 24 * 60 * 60 * 1000;
const cards = new Set(['a', 'b']);
const event = (source: string, daysAgo: number, cardId = 'a') => ({ cardId, source, reviewedAt: NOW - daysAgo * DAY });

test('after a lesson quiz, tones comes first', () => {
  assert.equal(pickPracticeSuggestion([event('quiz', 0), event('flashcards', 0)], cards, true, NOW), 'tones');
});

test('a mode practised on these words this week is skipped', () => {
  assert.equal(pickPracticeSuggestion([event('tones', 1)], cards, true, NOW), 'writing');
  assert.equal(pickPracticeSuggestion([event('tones', 1), event('writing', 2)], cards, true, NOW), 'sentences');
});

test('practice older than a week, or on other words, does not count', () => {
  assert.equal(pickPracticeSuggestion([event('tones', 8)], cards, true, NOW), 'tones');
  assert.equal(pickPracticeSuggestion([event('tones', 0, 'other')], cards, true, NOW), 'tones');
});

test('sentences is only suggested when the part has sentences', () => {
  assert.equal(pickPracticeSuggestion([event('tones', 0), event('writing', 0)], cards, false, NOW), 'pinyin');
});
