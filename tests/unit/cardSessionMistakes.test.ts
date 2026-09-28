import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { normalizePronunciationRate } from '../../src/features/practice/components/PracticeSettingsScreen';
import { queueMissedItem } from '../../src/utils/mistakeQueue';

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

test('queueMissedItem returns identical array unchanged when repeat is off', () => {
  const card1 = createMockCard('c1');
  const card2 = createMockCard('c2');
  const deck = [card1, card2];

  const result = queueMissedItem(deck, card1, 0, 'off');
  assert.equal(result, deck);
  assert.equal(result.length, 2);
});

test('rapid sequential reviews with repeat mistakes off processes all cards without lockup', () => {
  const cards = [
    createMockCard('c1'),
    createMockCard('c2'),
    createMockCard('c3'),
    createMockCard('c4'),
  ];

  let currentIndex = 0;
  let activeCards = [...cards];
  const firstAttemptMissed = new Set<string>();
  const reviewedCards: Array<{ id: string; quality: number }> = [];
  const sessionResults: Record<string, number> = {};

  const handleReviewSwipe = (level: number) => {
    const card = activeCards[currentIndex];
    assert.ok(card, `Card at index ${currentIndex} must exist`);

    const wasMissed = firstAttemptMissed.has(card.id);
    if (level <= 2 && !wasMissed) {
      firstAttemptMissed.add(card.id);
      reviewedCards.push({ id: card.id, quality: level });
      sessionResults[card.id] = level;
      // When repeat is off, queue is not appended
      activeCards = queueMissedItem(activeCards, card, currentIndex, 'off');
    }

    // Advance
    if (currentIndex < activeCards.length - 1) {
      currentIndex += 1;
      return 'advanced';
    }
    return 'completed';
  };

  // User rapidly swipes "Review" (level 1) across the first 3 cards
  assert.equal(handleReviewSwipe(1), 'advanced');
  assert.equal(currentIndex, 1);
  assert.equal(activeCards.length, 4);

  assert.equal(handleReviewSwipe(1), 'advanced');
  assert.equal(currentIndex, 2);
  assert.equal(activeCards.length, 4);

  assert.equal(handleReviewSwipe(1), 'advanced');
  assert.equal(currentIndex, 3);
  assert.equal(activeCards.length, 4);

  // Fourth and last card
  assert.equal(handleReviewSwipe(1), 'completed');
  assert.equal(currentIndex, 3);

  // All 4 cards were reviewed as mistakes
  assert.equal(reviewedCards.length, 4);
  assert.equal(firstAttemptMissed.size, 4);
  assert.deepEqual(Object.keys(sessionResults), ['c1', 'c2', 'c3', 'c4']);
});

test('rapid sequential swipe ratings are accepted immediately on index advance without freeze', () => {
  let currentIndex = 0;
  let lastRatedIndex: number | null = null;
  let ratePending = false;
  const gradedCards: number[] = [];

  const triggerSwipeRate = (cardIndex: number): boolean => {
    if (lastRatedIndex === cardIndex) return false;
    if (ratePending) return false;
    ratePending = true;
    lastRatedIndex = cardIndex;
    gradedCards.push(cardIndex);
    return true;
  };

  const onRenderCommit = (newIndex: number) => {
    currentIndex = newIndex;
    ratePending = false;
    lastRatedIndex = null;
  };

  // Card 0: First swipe accepted
  assert.equal(triggerSwipeRate(currentIndex), true);
  // Duplicate swipe before render commit is rejected
  assert.equal(triggerSwipeRate(currentIndex), false);

  // Render commits to Card 1: locks are released
  onRenderCommit(1);

  // Rapid swipe on Card 1 immediately follows without artificial delay: accepted
  assert.equal(triggerSwipeRate(currentIndex), true);
  // Duplicate swipe on Card 1 before commit is rejected
  assert.equal(triggerSwipeRate(currentIndex), false);

  // Render commits to Card 2: locks are released
  onRenderCommit(2);

  // Rapid swipe on Card 2 immediately follows: accepted
  assert.equal(triggerSwipeRate(currentIndex), true);

  assert.deepEqual(gradedCards, [0, 1, 2]);
});

test('exiting or swiped cards are non-interactive to prevent ghost touch interception', () => {
  const computeIsInteractive = (isPresent: boolean, isSwiped: boolean) => isPresent && !isSwiped;

  // Active mounted card
  assert.equal(computeIsInteractive(true, false), true);

  // Card swiped away (animating exit)
  assert.equal(computeIsInteractive(true, true), false);

  // Card unmounted by AnimatePresence
  assert.equal(computeIsInteractive(false, false), false);

  // Exiting swiped card
  assert.equal(computeIsInteractive(false, true), false);
});

test('rating the last card as Again re-queues it and advances instead of completing the session', () => {
  const cards = [
    createMockCard('c1'),
    createMockCard('c2'),
    createMockCard('c3'),
  ];

  let currentIndex = 0;
  let activeCards = [...cards];
  const firstAttemptMissed = new Set<string>();
  const reviewedCards: Array<{ id: string; quality: number }> = [];
  const sessionResults: Record<string, number> = {};

  const handleRate = (quality: number, repeat: 'soon' | 'end' | 'off') => {
    const card = activeCards[currentIndex];
    assert.ok(card, `Card at index ${currentIndex} must exist`);

    const wasMissed = firstAttemptMissed.has(card.id);
    if (quality <= 2) {
      if (!wasMissed) {
        firstAttemptMissed.add(card.id);
        reviewedCards.push({ id: card.id, quality });
        sessionResults[card.id] = quality;
      }
      if (repeat !== 'off') {
        activeCards = queueMissedItem(activeCards, card, currentIndex, repeat);
      }
    } else {
      if (!wasMissed) {
        reviewedCards.push({ id: card.id, quality });
        sessionResults[card.id] = quality;
      }
    }

    if (currentIndex < activeCards.length - 1) {
      currentIndex += 1;
      return 'advanced';
    }
    return 'completed';
  };

  // c1 and c2 pass
  assert.equal(handleRate(4, 'soon'), 'advanced'); // moves to c2 (index 1)
  assert.equal(handleRate(4, 'soon'), 'advanced'); // moves to c3 (index 2)
  assert.equal(currentIndex, 2);
  assert.equal(activeCards.length, 3);

  // c3 is the LAST card: rated as Again (quality 1)
  // Must NOT complete! Must re-queue c3 and advance to index 3!
  assert.equal(handleRate(1, 'soon'), 'advanced');
  assert.equal(currentIndex, 3);
  assert.equal(activeCards.length, 4);
  assert.equal(activeCards[3].id, 'c3');

  // On the retry card at index 3, if user misses again:
  assert.equal(handleRate(1, 'soon'), 'advanced');
  assert.equal(currentIndex, 4);
  assert.equal(activeCards.length, 5);
  assert.equal(activeCards[4].id, 'c3');

  // Finally answered correctly on index 4: now completes!
  assert.equal(handleRate(4, 'soon'), 'completed');
  assert.equal(currentIndex, 4);

  // Only initial attempt was recorded in SRS / reviewedCards
  assert.equal(reviewedCards.length, 3);
  assert.equal(sessionResults['c3'], 1);
});

test('single card deck rated as Again does not complete on first try', () => {
  const cards = [createMockCard('c1')];
  let currentIndex = 0;
  let activeCards = [...cards];
  const firstAttemptMissed = new Set<string>();

  const rate = (quality: number) => {
    const card = activeCards[currentIndex];
    const wasMissed = firstAttemptMissed.has(card.id);
    if (quality <= 2) {
      if (!wasMissed) firstAttemptMissed.add(card.id);
      activeCards = queueMissedItem(activeCards, card, currentIndex, 'soon');
    }
    if (currentIndex < activeCards.length - 1) {
      currentIndex += 1;
      return 'advanced';
    }
    return 'completed';
  };

  assert.equal(rate(1), 'advanced');
  assert.equal(currentIndex, 1);
  assert.equal(activeCards.length, 2);
  assert.equal(activeCards[1].id, 'c1');

  // Pass on retry
  assert.equal(rate(4), 'completed');
});

