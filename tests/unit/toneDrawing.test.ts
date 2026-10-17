import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyStroke, levelToY, toneContour, type TonePoint } from '../../src/screens/tones/utils/toneShapes';
import { spokenTones, toneTargets } from '../../src/screens/tones/utils/toneTargets';

const line = (...levels: number[]): TonePoint[] => levels.map((level, i) => [10 + (i * 80) / (levels.length - 1), levelToY(level)]);

test('each ideal contour reads back as its own tone', () => {
  for (const tone of [1, 2, 3, 4] as const) assert.equal(classifyStroke(toneContour(tone)), tone);
});

test('hand-drawn lines read by how the pitch moves', () => {
  assert.equal(classifyStroke(line(4.6, 4.8, 4.7)), 1);
  assert.equal(classifyStroke(line(2.5, 3.5, 4.8)), 2);
  assert.equal(classifyStroke(line(2.2, 1, 1.2, 3.8)), 3);
  assert.equal(classifyStroke(line(1.5, 1.2, 1.4)), 3); // low and flat: a half third tone
  assert.equal(classifyStroke(line(5, 3, 1)), 4);
});

test('a tap is the neutral tone', () => {
  assert.equal(classifyStroke([[50, 50]]), 5);
  assert.equal(classifyStroke([[50, 50], [53, 52]]), 5);
});

test('tone sandhi: 3+3, 不 and 一', () => {
  assert.deepEqual(spokenTones(['你', '好'], [3, 3]), [2, 3]);
  assert.deepEqual(spokenTones(['不', '要'], [4, 4]), [2, 4]);
  assert.deepEqual(spokenTones(['不', '好'], [4, 3]), [4, 3]);
  assert.deepEqual(spokenTones(['一', '定'], [1, 4]), [2, 4]);
  assert.deepEqual(spokenTones(['一', '起'], [1, 3]), [4, 3]);
  assert.deepEqual(spokenTones(['十', '一'], [2, 1]), [2, 1]);
});

test('targets pair each character with its syllable', () => {
  const targets = toneTargets({ front: '對不起', pinyin: 'duìbuqǐ' });
  assert.deepEqual(targets?.map((t) => [t.char, t.base, t.written, t.spoken]), [['對', 'dui', 4, 4], ['不', 'bu', 5, 5], ['起', 'qi', 3, 3]]);
  assert.deepEqual(toneTargets({ front: '你好', pinyin: 'nǐhǎo' })?.map((t) => t.spoken), [2, 3]);
});

test('words that cannot be drawn are left out', () => {
  assert.equal(toneTargets({ front: '一路順風的', pinyin: 'yílù shùnfēng de' }), null);
  assert.equal(toneTargets({ front: 'T恤', pinyin: 'T xù' }), null);
  assert.equal(toneTargets({ front: '書', pinyin: undefined }), null);
});
