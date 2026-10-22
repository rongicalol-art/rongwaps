import assert from 'node:assert/strict';
import test from 'node:test';
import { sentenceSegments, validatedSentenceSegments } from '../../src/utils/vocabulary/sentenceSegments';

test('unknown groups split into known words, retaining compounds and UTF-16 offsets', () => {
  const input = '𠀀也把電腦。';
  const result = validatedSentenceSegments([
    { segment: '𠀀也把電腦', index: 0, input, isWordLike: true },
    { segment: '。', index: 6, input, isWordLike: false },
  ], new Set(['電腦']));
  assert.deepEqual(result.map(part => part.segment), ['𠀀', '也', '把', '電腦', '。']);
  for (const part of result) assert.equal(input.slice(part.index, part.index + part.segment.length), part.segment);
});

test('authored boundaries win, while punctuation and sentence text remain intact', () => {
  const text = '也把電腦拿來，忙不忙？';
  const result = sentenceSegments(text, ['電腦', '忙不忙']);
  assert.equal(result.map(part => part.segment).join(''), text);
  assert.ok(result.some(part => part.segment === '忙不忙'));
  assert.ok(result.some(part => part.segment === '電腦'));
});

test('traditional and simplified compounds use the same validation rules', () => {
  for (const word of ['電腦', '电脑']) {
    const text = `也把${word}`;
    const result = validatedSentenceSegments([{ segment: text, index: 0, input: text, isWordLike: true }], new Set([word]));
    assert.deepEqual(result.map(part => part.segment), ['也', '把', word]);
  }
});
