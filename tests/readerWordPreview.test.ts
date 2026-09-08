import assert from 'node:assert/strict';
import test from 'node:test';
import { extractUniqueChineseWords, formatWordPreview } from '../src/screens/reader/utils/readerWordPreview';
import type { DBDictionaryEntry } from '../src/types/database';

test('extractUniqueChineseWords extracts words and ignores punctuation', () => {
  const paragraphs = [
    { traditional: '你好！今天天氣很好。' },
    { traditional: '我們一起去圖書館吧！' },
  ];

  const words = extractUniqueChineseWords(paragraphs, 'traditional');

  assert.ok(words.length > 0);
  assert.ok(words.includes('你好'));
  assert.ok(words.includes('天氣'));
  assert.ok(!words.includes('！'));
  assert.ok(!words.includes('。'));
});

test('extractUniqueChineseWords respects simplified script preference', () => {
  const paragraphs = [
    { traditional: '圖書館', simplified: '图书馆', pinyin: 'túshūguǎn' },
  ];

  const words = extractUniqueChineseWords(paragraphs, 'simplified');
  assert.ok(words.includes('图书'));
  assert.ok(!words.includes('圖書'));
});

test('formatWordPreview formats up to 2 primary definitions and preserves count', () => {
  const mockEntry: DBDictionaryEntry = {
    traditional: '你好',
    simplified: '你好',
    pinyin: ['nǐ hǎo'],
    definitions: ['hello', 'hi', 'how are you', 'greetings'],
  };

  const preview = formatWordPreview('你好', mockEntry);

  assert.equal(preview.word, '你好');
  assert.equal(preview.pinyin, 'nǐ hǎo');
  assert.equal(preview.definitions.length, 2);
  assert.equal(preview.definitions[0], 'hello');
  assert.equal(preview.definitions[1], 'hi');
  assert.equal(preview.totalDefinitions, 4);
});

test('formatWordPreview handles empty or missing entry gracefully', () => {
  const preview = formatWordPreview('未知詞', null, 'wèi zhī cí');

  assert.equal(preview.word, '未知詞');
  assert.equal(preview.pinyin, 'wèi zhī cí');
  assert.deepEqual(preview.definitions, []);
  assert.equal(preview.totalDefinitions, 0);
});
