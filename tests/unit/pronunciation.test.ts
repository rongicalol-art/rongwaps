import assert from 'node:assert/strict';
import test from 'node:test';
import { allReadings, formatReadings, parseReadings, primaryReading, soundPair, type ReadingsIndex } from '../../src/utils/pinyin/pronunciation';

test('parseReadings reads primary, variant (~) and other readings with examples; formatReadings inverts it', () => {
  const value = 'xíng|háng:銀行|shuí~';
  assert.deepEqual(parseReadings(value), [
    { pinyin: 'xíng', kind: 'primary' },
    { pinyin: 'háng', kind: 'other', example: '銀行' },
    { pinyin: 'shuí', kind: 'variant' },
  ]);
  assert.equal(formatReadings(parseReadings(value)), value);
});

test('primaryReading prefers the index, then the fallback', () => {
  const index: ReadingsIndex = new Map([['誰', parseReadings('shéi|shuí~')]]);
  assert.equal(primaryReading('誰', index, 'shuí'), 'shéi');
  assert.equal(primaryReading('龘', index, 'dá'), 'dá');
  assert.equal(primaryReading('誰', null, 'shuí'), 'shuí');
  assert.deepEqual(allReadings('龘', index), []);
});

test('soundPair picks the closest-sounding character and part readings', () => {
  assert.deepEqual(soundPair(['shéi', 'shuí'], ['zhuī']), { char: 'shuí', part: 'zhuī' });
  assert.deepEqual(soundPair(['zhāng'], ['cháng', 'zhǎng']), { char: 'zhāng', part: 'zhǎng' });
  assert.deepEqual(soundPair(['mā'], ['mǎ']), { char: 'mā', part: 'mǎ' });
  assert.deepEqual(soundPair([], ['mǎ']), { char: undefined, part: 'mǎ' });
});
