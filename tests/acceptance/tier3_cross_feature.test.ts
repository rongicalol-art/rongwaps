import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lineIndexForTime,
  wordRangeForTime,
} from '../../src/utils/dialogueSync';
import {
  createSingleFlightSaveCoordinator,
  getSessionProgressDelta,
  mergePulledSrsData,
} from '../../src/utils/cloudSyncQueue';
import { alignRubyPinyin, splitPinyinWordToSyllables } from '../../src/utils/rubyPinyin';
import { getDialogueSpeakerColorMap } from '../../src/utils/speakerColors';
import type { SRSData } from '../../src/utils/srsEngine';

function srs(cardId: string, overrides: Partial<SRSData> = {}): SRSData {
  return { cardId, interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: 1000, ...overrides };
}

test('Tier 3: Cross-Feature - Dialogue Audio Sync + Ruby Pinyin Character Alignment', () => {
  const lineText = '你好，很高興認識你！';

  // 1. Audio alignment simulation
  const alignment = {
    audioFile: 'b1l1d1.mp3',
    lessonId: 1,
    dialogueNumber: 1,
    trimSec: 0,
    lines: [
      {
        index: 0,
        speaker: '李小姐',
        text: lineText,
        start: 0.5,
        end: 5.5,
        words: [
          { w: '你好', charStart: 0, charEnd: 2, start: 0.5, end: 1.5 },
          { w: '很高興', charStart: 3, charEnd: 6, start: 1.8, end: 3.2 },
          { w: '認識', charStart: 6, charEnd: 8, start: 3.2, end: 4.2 },
          { w: '你', charStart: 8, charEnd: 9, start: 4.2, end: 4.8 },
        ],
      },
    ],
  };

  // At time 2.5s, active line is 0, active word is "很高興"
  const activeLine = lineIndexForTime(alignment, 2.5);
  assert.equal(activeLine, 0);

  const wordRange = wordRangeForTime(alignment, activeLine!, 2.5, lineText);
  assert.deepEqual(wordRange, { start: 3, end: 6 });

  const activeSubstring = lineText.slice(wordRange!.start, wordRange!.end);
  assert.equal(activeSubstring, '很高興');

  // 2. Ruby pinyin alignment splits compound syllables 1-to-1
  const syllables = splitPinyinWordToSyllables('gāoxìng');
  assert.deepEqual(syllables, ['gāo', 'xìng']);

  const rubyPairs = alignRubyPinyin('高興', 'gāoxìng');
  assert.deepEqual(rubyPairs, [
    { char: '高', pinyin: 'gāo', isPunctuation: false },
    { char: '興', pinyin: 'xìng', isPunctuation: false },
  ]);
});

test('Tier 3: Cross-Feature - SRS Card Learning + Cloud Delta Reconciliation + Single-Flight Save', async () => {
  // 1. User reviews cards locally
  const initialLocal = { 'c1': srs('c1', { interval: 1, efactor: 2.5 }) };
  const reviewedLocal = {
    'c1': srs('c1', { interval: 3, repetition: 2, efactor: 2.6, nextReviewDate: 5000 }),
    'c2': srs('c2', { interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: 2000 }),
  };

  const sessionStart = { cardsReviewed: 0, cardsLearned: 0 };
  const sessionProgress = { cardsReviewed: 2, cardsLearned: 1 };

  // 2. Calculate session delta
  const delta = getSessionProgressDelta(sessionProgress, sessionStart);
  assert.deepEqual(delta, { cardsReviewed: 2, cardsLearned: 1 });

  // 3. Save through single-flight coordinator during concurrent attempts
  const savedSnapshots: Array<{ cards: Record<string, SRSData>; progress: unknown }> = [];
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: 'f1', value: { cards: reviewedLocal, progress: delta } }),
    async (snapshot) => {
      savedSnapshots.push(snapshot);
    },
  );

  await Promise.all([
    coordinator.request(),
    coordinator.request(),
  ]);

  // Both concurrent calls share exactly one network save
  assert.equal(savedSnapshots.length, 1);
  assert.equal(Object.keys(savedSnapshots[0].cards).length, 2);

  // 5. Pull and merge when server had updates to an untouched card
  const serverSnapshot = {
    'c3': srs('c3', { interval: 10, nextReviewDate: 9999 }),
  };

  const { merged } = mergePulledSrsData({
    priorBaseline: initialLocal,
    atPullStart: reviewedLocal,
    current: reviewedLocal,
    cloud: serverSnapshot,
  });

  // Merged state must have local reviewed cards + untouched remote card
  assert.ok('c1' in merged && 'c2' in merged && 'c3' in merged);
  assert.equal(merged['c1'].interval, 3, 'In-flight review of c1 preserved');
  assert.equal(merged['c3'].interval, 10, 'Remote card c3 incorporated');
});

test('Tier 3: Cross-Feature - Speaker Identity + Distinct Color Palettes', () => {
  const paragraphs = [
    { speaker: '宜文', text: '你好' },
    { speaker: '友美', text: '你好嗎' },
    { speaker: '國安', text: '大家早' },
  ];

  const colorMap = getDialogueSpeakerColorMap(paragraphs);
  const colors = ['宜文', '友美', '國安'].map((s) => colorMap.get(s));

  // Ensure all speakers received colors
  assert.ok(colors.every(Boolean), 'All speakers must receive a color');

  // Ensure distinct colors
  const uniqueColors = new Set(colors);
  assert.equal(uniqueColors.size, 3, 'Speakers in same dialogue must have distinct colors');
});
