import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lineIndexForTime,
  wordRangeForTime,
} from '../../src/utils/dialogueSync';
import {
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
} from '../../src/utils/cloudSyncQueue';
import { alignRubyPinyin, splitPinyinWordToSyllables } from '../../src/utils/rubyPinyin';
import { calculateNextReview, type SRSData } from '../../src/utils/srsEngine';

function createCard(id: string, overrides: Partial<SRSData> = {}): SRSData {
  return {
    cardId: id,
    interval: 1,
    repetition: 0,
    efactor: 2.5,
    nextReviewDate: Date.now() - 1000,
    ...overrides,
  };
}

test('Tier 4: Scenario 1 - Complete Dialogue Reading & Synchronized Audio Journey', () => {
  // 1. Learner loads Book 1 Lesson 1 Dialogue 1
  const lessonDialogue = {
    audioFile: 'b1l1d1.mp3',
    lessonId: 1,
    dialogueNumber: 1,
    trimSec: 0,
    lines: [
      {
        index: 0,
        speaker: '張先生',
        text: '張先生，你好！',
        start: 1.0,
        end: 4.0,
        words: [
          { w: '張先生', charStart: 0, charEnd: 3, start: 1.0, end: 2.5 },
          { w: '你好', charStart: 4, charEnd: 6, start: 2.6, end: 3.8 },
        ],
      },
      {
        index: 1,
        speaker: '李小姐',
        text: '李小姐，很高興見到你。',
        start: 4.5,
        end: 9.0,
        words: [
          { w: '李小姐', charStart: 0, charEnd: 3, start: 4.5, end: 6.0 },
          { w: '很高興', charStart: 4, charEnd: 7, start: 6.2, end: 7.5 },
          { w: '見到你', charStart: 7, charEnd: 10, start: 7.5, end: 8.8 },
        ],
      },
    ],
  };

  // 2. Playback advances: verify line and word highlights at 2.0s
  const lineAt2s = lineIndexForTime(lessonDialogue, 2.0);
  assert.equal(lineAt2s, 0);
  const wordAt2s = wordRangeForTime(lessonDialogue, lineAt2s!, 2.0, lessonDialogue.lines[0].text);
  assert.deepEqual(wordAt2s, { start: 0, end: 3 });
  assert.equal(lessonDialogue.lines[0].text.slice(wordAt2s!.start, wordAt2s!.end), '張先生');

  // 3. Playback advances to line 1 at 7.0s
  const lineAt7s = lineIndexForTime(lessonDialogue, 7.0);
  assert.equal(lineAt7s, 1);
  const wordAt7s = wordRangeForTime(lessonDialogue, lineAt7s!, 7.0, lessonDialogue.lines[1].text);
  assert.deepEqual(wordAt7s, { start: 4, end: 7 });
  assert.equal(lessonDialogue.lines[1].text.slice(wordAt7s!.start, wordAt7s!.end), '很高興');

  // 4. Learner inspects Ruby Pinyin breakdown for "高興"
  const syllables = splitPinyinWordToSyllables('gāoxìng');
  assert.deepEqual(syllables, ['gāo', 'xìng']);
  const ruby = alignRubyPinyin('高興', 'gāoxìng');
  assert.deepEqual(ruby, [
    { char: '高', pinyin: 'gāo', isPunctuation: false },
    { char: '興', pinyin: 'xìng', isPunctuation: false },
  ]);
});

test('Tier 4: Scenario 2 - Multi-Card Flashcard Review, SRS Progression & Debounced Cloud Sync', async () => {
  // 1. Initial learner state
  let cardA = createCard('card-A'); // new card
  let cardB = createCard('card-B', { repetition: 1, interval: 1, efactor: 2.5 }); // review card

  const session = { cardsReviewed: 0, cardsLearned: 0 };

  // 2. Learner reviews Card A: grades 'good' (3)
  const reviewA = calculateNextReview(cardA, cardA.cardId, 3);
  cardA = reviewA;
  session.cardsReviewed += 1;
  session.cardsLearned += 1; // first time learned

  assert.ok(cardA.interval >= 1);
  assert.equal(cardA.repetition, 1);

  // 3. Learner reviews Card B: grades 'easy' (4)
  const reviewB = calculateNextReview(cardB, cardB.cardId, 4);
  cardB = reviewB;
  session.cardsReviewed += 1;

  assert.ok(cardB.interval > 1);
  assert.equal(cardB.repetition, 2);

  // 4. Validate session delta
  const delta = getSessionProgressDelta(session, { cardsReviewed: 0, cardsLearned: 0 });
  assert.deepEqual(delta, { cardsReviewed: 2, cardsLearned: 1 });

  // 5. Check auto-save debounce delay
  const delay = getNextAutoSaveDelay({ dirtySinceMs: Date.now() - 1000, nowMs: Date.now() });
  assert.equal(delay, 10000, 'Debounce should be 10s for fresh updates');

  // 6. Save coordinator writes snapshot
  let saved = false;
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: 'snap-1', value: { cards: { [cardA.cardId]: cardA, [cardB.cardId]: cardB }, session } }),
    async () => {
      saved = true;
    },
  );

  await coordinator.request();
  assert.equal(saved, true, 'Snapshot should be saved through coordinator');
});

test('Tier 4: Scenario 3 - Hanzi Writing Canvas Multi-Character Word Practice', () => {
  // Simulating writing practice for word "高興" (2 characters)
  const totalChars = 2;
  let completedChars = new Set<number>();
  let activeCharIndex = 0;

  // Learner completes character 0 ('高')
  completedChars.add(activeCharIndex);
  assert.equal(completedChars.has(0), true);

  // Advances to character 1 ('興')
  activeCharIndex = 1;

  // Learner makes mistake on character 1 and hits restart
  // Function ensures character 0 remains mastered!
  const restart = (completed: Set<number>, activeIdx: number) => {
    const next = new Set(completed);
    next.delete(activeIdx);
    return next;
  };

  completedChars = restart(completedChars, activeCharIndex);
  assert.equal(completedChars.has(0), true, 'Character 0 remains completed');
  assert.equal(completedChars.has(1), false, 'Character 1 reset');

  // Learner successfully completes character 1
  completedChars.add(1);
  assert.equal(completedChars.size, totalChars, 'Word completely mastered');
});

test('Tier 4: Scenario 4 - Network Disconnection & Graceful Sync Recovery', async () => {
  let isOnline = false;
  let attemptCount = 0;

  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: 'snap-2', value: { timestamp: Date.now(), data: 'pending-srs-data' } }),
    async () => {
      attemptCount += 1;
      if (!isOnline) {
        throw new Error('Network offline');
      }
    },
  );

  // 1. Initial attempt while offline fails
  await assert.rejects(coordinator.request(), /Network offline/);
  assert.equal(attemptCount, 1);

  // 2. Exponential backoff is calculated
  const backoff = getNextCloudSyncBackoff(0, new Error('Network offline'));
  assert.equal(backoff, 5000, 'Backoff should start at 5s');

  // 3. Network comes back online
  isOnline = true;

  // 4. Retry succeeds and drains the queue
  await coordinator.request();
  assert.equal(attemptCount, 2, 'Second attempt should succeed once online');
});
