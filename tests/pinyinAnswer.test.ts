import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPinyinAnswerVariants,
  isPinyinAnswerAccepted,
  normalizePinyinAnswer,
} from '../src/utils/pinyinAnswer';

test('pinyin matching ignores tones, numbers, spacing, and punctuation', () => {
  assert.equal(normalizePinyinAnswer('Nǐ hǎo!'), 'nihao');
  assert.equal(isPinyinAnswerAccepted('ni3 hao3', 'nǐ hǎo'), true);
  assert.equal(isPinyinAnswerAccepted("nǐ-hǎo", 'nǐ hǎo'), true);
});

test('optional parenthesized syllables may be included or omitted', () => {
  assert.deepEqual(
    getPinyinAnswerVariants('(yì)diǎn(r)'),
    ['dian', 'dianr', 'yidian', 'yidianr'],
  );
  assert.equal(isPinyinAnswerAccepted('xiang', 'xiǎng(yào)'), true);
  assert.equal(isPinyinAnswerAccepted('xiang yao', 'xiǎng(yào)'), true);
});

test('either slash-separated pronunciation is accepted', () => {
  assert.equal(isPinyinAnswerAccepted('jiaose', 'jiǎosè/juésè'), true);
  assert.equal(isPinyinAnswerAccepted('juese', 'jiǎosè/juésè'), true);
  assert.equal(isPinyinAnswerAccepted('jiaojue', 'jiǎosè/juésè'), false);
});

test('v and u-colon keyboard forms match umlaut pinyin', () => {
  assert.equal(isPinyinAnswerAccepted('lvshi', 'lǜshī'), true);
  assert.equal(isPinyinAnswerAccepted('lu:shi', 'lǜshī'), true);
});
