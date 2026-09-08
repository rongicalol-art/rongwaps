import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignmentDuration,
  lineIndexForTime,
  wordRangeForTime,
} from '../../src/utils/dialogueSync';
import {
  createSingleFlightSaveCoordinator,
  getSessionProgressDelta,
  planFolderSync,
} from '../../src/utils/cloudSyncQueue';
import {
  formatPosLabel,
  getPosCategory,
  getPosExplanation,
} from '../../src/utils/posLabels';
import { CHARACTER_PROFILES, getCharacterForSpeaker } from '../../src/utils/speakerCharacters';

test('Tier 1: Cloud Sync - Session progress delta computes strictly positive incremental deltas', () => {
  const previous = { cardsReviewed: 20, cardsLearned: 5 };
  const current = { cardsReviewed: 25, cardsLearned: 7 };

  const delta = getSessionProgressDelta(current, previous);
  assert.deepEqual(delta, { cardsReviewed: 5, cardsLearned: 2 });
});

test('Tier 1: Cloud Sync - Single-flight save coordinator executes cleanly and returns result', async () => {
  let executedCount = 0;
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: 'state-1', value: { data: 'test-payload' } }),
    async (snapshot) => {
      executedCount += 1;
      assert.equal(snapshot.data, 'test-payload');
    },
  );

  await coordinator.request();
  assert.equal(executedCount, 1, 'Coordinator should have executed save handler once');
});

test('Tier 1: Cloud Sync - Folder sync plan accurately separates upserts and deletes', () => {
  const localFolders = [
    { id: 'f1', name: 'HSK 1', color: '#10b981' },
    { id: 'f2', name: 'HSK 2', color: '#3b82f6' },
  ];
  const tombstones = ['f3'];
  const remoteFolderIds = ['f1', 'f3', 'f4'];

  const plan = planFolderSync(localFolders, tombstones, remoteFolderIds);

  assert.deepEqual(plan.toUpsert, localFolders, 'All active local folders should be upserted');
  assert.deepEqual(plan.toDelete, ['f3', 'f4'], 'Tombstones and orphaned remote folders should be deleted');
});

test('Tier 1: Dialogue Sync - Computes valid line index for given timestamps', () => {
  const mockAlignment = {
    audioFile: 'test.mp3',
    lessonId: 1,
    dialogueNumber: 1,
    trimSec: 0,
    lines: [
      {
        index: 0,
        speaker: '李小姐',
        text: '你好！',
        start: 1.0,
        end: 3.0,
        words: [
          { w: '你好', charStart: 0, charEnd: 2, start: 1.0, end: 2.5 },
        ],
      },
      {
        index: 1,
        speaker: '張先生',
        text: '很高興見到你。',
        start: 4.0,
        end: 7.0,
        words: [
          { w: '很', charStart: 0, charEnd: 1, start: 4.0, end: 4.5 },
          { w: '高興', charStart: 1, charEnd: 3, start: 4.5, end: 5.5 },
        ],
      },
    ],
  };

  assert.equal(lineIndexForTime(mockAlignment, 0.5), null, 'Before first line start should be null');
  assert.equal(lineIndexForTime(mockAlignment, 1.5), 0, 'Timestamp 1.5 should map to line 0');
  assert.equal(lineIndexForTime(mockAlignment, 3.5), 0, 'Between lines 0 and 1 keeps line 0 active');
  assert.equal(lineIndexForTime(mockAlignment, 5.0), 1, 'Timestamp 5.0 should map to line 1');
  assert.equal(alignmentDuration(mockAlignment), 7.0, 'Duration should equal end of last valid line');
});

test('Tier 1: Dialogue Sync - wordRangeForTime extracts accurate character boundaries', () => {
  const mockAlignment = {
    audioFile: 'test.mp3',
    lessonId: 1,
    dialogueNumber: 1,
    trimSec: 0,
    lines: [
      {
        index: 0,
        speaker: '張先生',
        text: '很高興見到你。',
        start: 1.0,
        end: 5.0,
        words: [
          { w: '很', charStart: 0, charEnd: 1, start: 1.0, end: 1.8 },
          { w: '高興', charStart: 1, charEnd: 3, start: 1.8, end: 3.2 },
          { w: '見到', charStart: 3, charEnd: 5, start: 3.2, end: 4.5 },
        ],
      },
    ],
  };

  const range = wordRangeForTime(mockAlignment, 0, 2.5, '很高興見到你。');
  assert.deepEqual(range, { start: 1, end: 3 }, 'Time 2.5 should highlight "高興" (index 1 to 3)');
});

test('Tier 1: Linguistic Metadata - Part of speech labels and category expansion', () => {
  assert.equal(formatPosLabel('N'), 'Noun');
  assert.equal(formatPosLabel('V'), 'Verb');
  assert.equal(formatPosLabel('Vs'), 'Stative verb');
  assert.equal(getPosCategory('N'), 'noun');
  assert.equal(getPosCategory('V'), 'verb');
  assert.ok(getPosExplanation('N', 'simplified').length > 0);
});

test('Tier 1: Speaker Character Profiling - Maps known speakers to character metadata', () => {
  const allKnownCharacters = ['李文彥', '張先生', '陳小姐', '王先生', '林愛麗'];
  for (const name of allKnownCharacters) {
    const characterId = getCharacterForSpeaker(name);
    if (characterId) {
      const profile = CHARACTER_PROFILES[characterId];
      assert.ok(profile.nameTraditional.length > 0, 'Resolved character must have a name');
      assert.ok(profile.gender === 'male' || profile.gender === 'female', 'Character must have valid gender');
    }
  }
});
