import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../src/data/flashcards';
import { normalizePronunciationRate } from '../src/features/practice/components/PracticeSettingsScreen';
import { queueMissedItem } from '../src/utils/mistakeQueue';

function createMockCard(id: string, front: string = '你好'): Flashcard {
  return {
    id,
    bookId: 1,
    lessonId: 1,
    front,
    back: 'hello',
    pinyin: 'nǐ hǎo',
  };
}

test('normalizePronunciationRate simplifies speed values to 3 clean presets', () => {
  // Slow range
  assert.equal(normalizePronunciationRate(0.6), 0.75);
  assert.equal(normalizePronunciationRate(0.75), 0.75);
  assert.equal(normalizePronunciationRate(0.85), 0.75);

  // Normal range
  assert.equal(normalizePronunciationRate(0.9), 1.0);
  assert.equal(normalizePronunciationRate(1.0), 1.0);
  assert.equal(normalizePronunciationRate(1.1), 1.0);

  // Fast range
  assert.equal(normalizePronunciationRate(1.15), 1.25);
  assert.equal(normalizePronunciationRate(1.25), 1.25);
  assert.equal(normalizePronunciationRate(1.5), 1.25);
});

test('first attempt mistake remains locked as unlearned despite immediate retry with correct answer', () => {
  const card1 = createMockCard('card-1');
  const card2 = createMockCard('card-2');

  const firstAttemptMissed = new Set<string>();
  const reviewedCards: Array<{ id: string; quality: number }> = [];
  const sessionResults: Record<string, number> = {};

  const recordAnswer = (card: Flashcard, quality: number) => {
    const wasMissed = firstAttemptMissed.has(card.id);

    if (quality <= 2) {
      if (!wasMissed) {
        firstAttemptMissed.add(card.id);
        reviewedCards.push({ id: card.id, quality });
        sessionResults[card.id] = quality;
      }
    } else {
      if (!wasMissed) {
        reviewedCards.push({ id: card.id, quality });
        sessionResults[card.id] = quality;
      }
    }
  };

  // Card 1 answered correctly on first try
  recordAnswer(card1, 4);
  assert.equal(sessionResults['card-1'], 4);
  assert.equal(firstAttemptMissed.has('card-1'), false);
  assert.deepEqual(reviewedCards, [{ id: 'card-1', quality: 4 }]);

  // Card 2 answered incorrectly on first try
  recordAnswer(card2, 2);
  assert.equal(sessionResults['card-2'], 2);
  assert.equal(firstAttemptMissed.has('card-2'), true);
  assert.deepEqual(reviewedCards, [
    { id: 'card-1', quality: 4 },
    { id: 'card-2', quality: 2 },
  ]);

  // User retries Card 2 immediately and selects the correct answer (quality 4)
  recordAnswer(card2, 4);

  // Must NOT overwrite sessionResults with 4 (remains 2, unlearned)
  assert.equal(sessionResults['card-2'], 2);

  // Must NOT issue false SRS credit for Card 2 on retry
  assert.deepEqual(reviewedCards, [
    { id: 'card-1', quality: 4 },
    { id: 'card-2', quality: 2 },
  ]);

  // End of session: reviewUnlearned accurately identifies card-2 as unlearned
  const unlearnedIds = Object.entries(sessionResults)
    .filter(([, quality]) => quality === 1 || quality === 2)
    .map(([id]) => id);

  assert.deepEqual(unlearnedIds, ['card-2']);

  const unlearnedCount = Object.values(sessionResults).filter((q) => q === 1 || q === 2).length;
  const learnedCount = Object.values(sessionResults).filter((q) => q > 2).length;

  assert.equal(unlearnedCount, 1);
  assert.equal(learnedCount, 1);
});

test('queueMissedItem inserts missed card without duplicating already queued items', () => {
  const card1 = createMockCard('c1');
  const card2 = createMockCard('c2');
  const deck = [card1, card2];

  // Repeat at end
  const updatedEnd = queueMissedItem(deck, card1, 0, 'end');
  assert.equal(updatedEnd.length, 3);
  assert.equal(updatedEnd[2].id, 'c1');

  // Should not re-add if already queued in future cards
  const duplicateCheck = queueMissedItem(updatedEnd, card1, 0, 'end');
  assert.equal(duplicateCheck.length, 3);
});
