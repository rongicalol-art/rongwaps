import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPinyinWordToSyllables, splitPinyinToSyllables } from '../../src/utils/pinyin/pinyinSyllables';

test('splitPinyinWordToSyllables: splits compound words accurately', () => {
  assert.deepEqual(splitPinyinWordToSyllables('kuànián'), ['kuà', 'nián']);
  assert.deepEqual(splitPinyinWordToSyllables('rènao'), ['rè', 'nao']);
  assert.deepEqual(splitPinyinWordToSyllables('piàoliàng'), ['piào', 'liàng']);
});

test('splitPinyinWordToSyllables: handles apostrophes, numbers, and erhua', () => {
  assert.deepEqual(splitPinyinWordToSyllables("zǎo'ān"), ['zǎo', 'ān']);
  assert.deepEqual(splitPinyinWordToSyllables('101'), ['101']);
  assert.deepEqual(splitPinyinWordToSyllables('diǎnr'), ['diǎn', 'r']);
});

test('splitPinyinToSyllables: extracts all syllables from sentence', () => {
  assert.deepEqual(
    splitPinyinToSyllables('Nǐ hǎo, shìjiè!'),
    ['Nǐ', 'hǎo', 'shì', 'jiè'],
  );
  assert.deepEqual(splitPinyinToSyllables(''), []);
});
