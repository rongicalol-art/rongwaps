import test from 'node:test';
import assert from 'node:assert/strict';
import { alignSentenceSyllables, alignWordSyllables, getPinyinTone, segmentPinyinTones } from '../../src/utils/pinyin/pinyinTones';
import { splitPinyinWordToSyllables } from '../../src/utils/pinyin/pinyinSyllables';
import { numberToToneMarks } from '../../src/utils/pinyin/pinyin';

test('getPinyinTone: reads the tone mark, unmarked is neutral', () => {
  assert.equal(getPinyinTone('zhī'), 1);
  assert.equal(getPinyinTone('lǘ'), 2);
  assert.equal(getPinyinTone('Nǐ'), 3);
  assert.equal(getPinyinTone('dào'), 4);
  assert.equal(getPinyinTone('ma'), 5);
  assert.equal(getPinyinTone('Ńg'), 2);
  assert.equal(getPinyinTone('Ǹg'), 4);
});

test('numberToToneMarks: preserves u: when not followed by a tone digit', () => {
  assert.equal(numberToToneMarks('Xiǎotōu: Wǒ'), 'Xiǎotōu: Wǒ');
  assert.equal(numberToToneMarks('lu:4'), 'lǜ');
  assert.equal(numberToToneMarks('lu:e4'), 'lüè');
});

test('splitter: a later syllable never starts with a vowel when a split exists', () => {
  assert.deepEqual(splitPinyinWordToSyllables('dàngāo'), ['dàn', 'gāo']);
  assert.deepEqual(splitPinyinWordToSyllables('kěnéng'), ['kě', 'néng']);
  assert.deepEqual(splitPinyinWordToSyllables('xīnán'), ['xī', 'nán']);
  assert.deepEqual(splitPinyinWordToSyllables('shēngāo'), ['shēn', 'gāo']);
});

test('segmentPinyinTones: round-trips text and tags each syllable', () => {
  const segments = segmentPinyinTones('(yì)diǎn(r)');
  assert.equal(segments.map((s) => s.text).join(''), '(yì)diǎn(r)');
  assert.deepEqual(segments.filter((s) => s.tone).map((s) => [s.text, s.tone]), [['yì', 4], ['diǎn', 3], ['r', 5]]);
  assert.deepEqual(segmentPinyinTones('kǎlā OK').map((s) => s.tone), [3, 1, undefined, undefined]);
  assert.deepEqual(segmentPinyinTones('zhi1dao4').map((s) => [s.text, s.tone]), [['zhī', 1], ['dào', 4]]);
});

const alignWordTones = (...args: Parameters<typeof alignWordSyllables>) =>
  alignWordSyllables(...args)?.map((s) => s?.tone ?? null) ?? null;

test('alignWordSyllables: puts each syllable over its own character', () => {
  assert.deepEqual(alignWordSyllables('知道', 'zhīdào'), [{ text: 'zhī', tone: 1 }, { text: 'dào', tone: 4 }]);
  assert.deepEqual(alignWordSyllables('臺灣', 'Táiwān', '臺灣/台灣')?.map((s) => s?.text), ['Tái', 'wān']);
  assert.deepEqual(alignWordSyllables('一點兒', '(yì)diǎn(r)')?.map((s) => s?.text), ['yì', 'diǎn', 'r']);
  assert.deepEqual(alignWordSyllables('這些', 'zhèxiē/zhèixiē')?.map((s) => s?.text), ['zhè/zhèi', 'xiē']);
  assert.deepEqual(alignWordSyllables('卡拉OK', 'kǎlāOK'), null);
});

test('alignWordTones: pairs each character with its own syllable tone', () => {
  assert.deepEqual(alignWordTones('知道', 'zhīdào'), [1, 4]);
  assert.deepEqual(alignWordTones('不客氣', 'bú kèqì'), [2, 4, 4]);
  assert.deepEqual(alignWordTones('一點兒', '(yì)diǎn(r)'), [4, 3, 5]);
  assert.deepEqual(alignWordTones('一點', 'yìdiǎnr'), [4, 3]);
  assert.deepEqual(alignWordTones('臺灣', 'Táiwān', '臺灣/台灣'), [2, 1]);
  assert.deepEqual(alignWordTones('卡拉OK', 'kǎlā OK'), null);
});

test('alignWordSyllables: "/" variants pair by position or must agree', () => {
  assert.deepEqual(alignWordTones('這麼', 'zhème/nàme', '這麼/那麼'), [4, 5]);
  assert.deepEqual(alignWordTones('這些', 'zhèxiē/zhèixiē'), [4, 1]);
  assert.equal(alignWordTones('差', 'chà/chā'), null);
  assert.equal(alignWordTones('和', 'hé/hàn'), null);
});

test('alignSentenceSyllables: handles interjections, 3C, and non-Han parentheticals', () => {
  const ng = alignSentenceSyllables('嗯，好。', 'Ǹg, hǎo.');
  assert.deepEqual(ng?.map((s) => s?.text ?? null), ['Ǹg', null, 'hǎo', null]);

  const threeC = alignSentenceSyllables('買3C產品。', 'Mǎi 3C chǎnpǐn.');
  assert.deepEqual(threeC?.map((s) => s?.text ?? null), ['Mǎi', null, null, 'chǎn', 'pǐn', null]);

  const bruce = alignSentenceSyllables('李小龍（Bruce Lee）很有名。', 'Lǐ Xiǎolóng (Bruce Lee) hěn yǒumíng.');
  assert.ok(bruce);
  assert.equal(bruce[0]?.text, 'Lǐ');

  const einstein = alignSentenceSyllables(
    '愛因斯坦（ Àiyīnsītǎn, Albert Einstein）很有名。',
    'Àiyīnsītǎn hěn yǒumíng.',
  );
  assert.ok(einstein);
  assert.equal(einstein[0]?.text, 'Ài');
});
