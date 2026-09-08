import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignmentDuration,
  lineIndexForTime,
  wordRangeForTime,
} from '../../src/utils/dialogueSync';
import {
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
  pruneAcknowledgedTombstones,
} from '../../src/utils/cloudSyncQueue';
import {
  formatPosLabel,
  getPosCategory,
} from '../../src/utils/posLabels';
import {
  isPinyinAnswerAccepted,
  normalizePinyinAnswer,
} from '../../src/utils/pinyinAnswer';

test('Tier 2: Dialogue Sync Boundaries - Empty and zero-length alignments return null safely', () => {
  const emptyAlignment = { audioFile: '', lessonId: 1, dialogueNumber: 1, trimSec: 0, lines: [] };

  assert.equal(lineIndexForTime(emptyAlignment, 0), null);
  assert.equal(lineIndexForTime(emptyAlignment, 10), null);
  assert.equal(lineIndexForTime(emptyAlignment, -5), null);
  assert.equal(alignmentDuration(emptyAlignment), 0);
});

test('Tier 2: Dialogue Sync Boundaries - Word range safely handles mismatched rendered text lengths', () => {
  const mockAlignment = {
    audioFile: 'test.mp3',
    lessonId: 1,
    dialogueNumber: 1,
    trimSec: 0,
    lines: [
      {
        index: 0,
        speaker: '李小姐',
        text: '這是一個測試', // 6 characters
        start: 0,
        end: 5.0,
        words: [
          { w: '這是', charStart: 0, charEnd: 2, start: 0, end: 2 },
        ],
      },
    ],
  };

  // When rendered text is different length, wordRangeForTime must return null to avoid incorrect highlighting
  const mismatchedRange = wordRangeForTime(mockAlignment, 0, 1.0, '這是測試'); // 4 characters
  assert.equal(mismatchedRange, null, 'Must return null on length mismatch');

  // Negative timestamp
  assert.equal(wordRangeForTime(mockAlignment, 0, -1.0, '這是一個測試'), null);

  // Out of range timestamp
  assert.equal(wordRangeForTime(mockAlignment, 0, 10.0, '這是一個測試'), null);

  // Non-existent line index
  assert.equal(wordRangeForTime(mockAlignment, 99, 1.0, '這是一個測試'), null);
});

test('Tier 2: Cloud Sync Boundaries - Negative progress deltas are clamped to current values', () => {
  // If local counter was reset or corrupted, deltas should fall back to current values without going negative
  const current = { cardsReviewed: 2, cardsLearned: 1 };
  const previousCorrupted = { cardsReviewed: 20, cardsLearned: 5 };

  const delta = getSessionProgressDelta(current, previousCorrupted);
  assert.deepEqual(delta, { cardsReviewed: 2, cardsLearned: 1 });
});

test('Tier 2: Cloud Sync Boundaries - Backoff calculation caps delay and penalizes rate limiting', () => {
  // Fresh failure
  const delay1 = getNextCloudSyncBackoff(0, new Error('network down'));
  assert.equal(delay1, 5000);

  // Rate limited 429
  const delayRateLimited = getNextCloudSyncBackoff(0, { status: 429 });
  assert.equal(delayRateLimited, 15000);

  // Growing backoff capped at 60s
  const delayCapped = getNextCloudSyncBackoff(50000, new Error('network down'));
  assert.equal(delayCapped, 60000);
});

test('Tier 2: Cloud Sync Boundaries - Tombstone pruning handles empty and disjoint lists', () => {
  assert.deepEqual(pruneAcknowledgedTombstones([], []), []);
  assert.deepEqual(pruneAcknowledgedTombstones(['t1', 't2'], []), []);
  assert.deepEqual(pruneAcknowledgedTombstones([], ['t1']), []);
  assert.deepEqual(pruneAcknowledgedTombstones(['t1'], ['t1']), ['t1']);
});

test('Tier 2: Linguistic Boundaries - POS formatting handles unknown, compound, and whitespace inputs', () => {
  assert.equal(formatPosLabel(''), null);
  assert.equal(formatPosLabel('   '), null);
  assert.equal(formatPosLabel('UNKNOWN_CODE'), 'UNKNOWN_CODE');
  assert.equal(formatPosLabel('  N / V  '), 'Noun / Verb');

  // getPosCategory handles compound codes
  assert.equal(getPosCategory('N/V'), 'noun');
  assert.equal(getPosCategory('V/ADJ'), 'verb');
  assert.equal(getPosCategory('UNKNOWN'), 'other');
});

test('Tier 2: Linguistic Boundaries - Pinyin matching handles umlauts, numbers, tone marks, and spacing', () => {
  // Standard tones vs numbers
  assert.equal(normalizePinyinAnswer('Nǐ hǎo!'), 'nihao');
  assert.ok(isPinyinAnswerAccepted('ni3 hao3', 'nǐ hǎo'));
  assert.ok(isPinyinAnswerAccepted('ni hao', 'nǐ hǎo'));

  // Umlauts
  assert.ok(isPinyinAnswerAccepted('lv3', 'lǚ'));
  assert.ok(isPinyinAnswerAccepted('lu:3', 'lǚ'));
  assert.ok(isPinyinAnswerAccepted('lü', 'lǚ'));

  // Alternative slashes
  assert.ok(isPinyinAnswerAccepted('jiaose', 'jiǎosè/juésè'));
  assert.ok(isPinyinAnswerAccepted('juese', 'jiǎosè/juésè'));

  // Parenthesized syllables
  assert.ok(isPinyinAnswerAccepted('shen', 'shén(me)'));
  assert.ok(isPinyinAnswerAccepted('shenme', 'shén(me)'));
});
