import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWordChunks } from '../../src/utils/pinyin/pinyinWordChunks';

// B1L07-R02 line 1: the stage direction （看地圖） is not spoken, so it has no timed characters.
const TEXT = '（看地圖）啊！天美飯店在這裡！';
const PINYIN = 'kàn dì tú a tiān měi fàn diàn zài zhè lǐ';
const chars = [
  { charStart: 5, charEnd: 6, start: 9.78, end: 10.94 }, // 啊
  { charStart: 7, charEnd: 8, start: 10.94, end: 11.3 }, // 天
  { charStart: 8, charEnd: 9, start: 11.3, end: 11.58 }, // 美
  { charStart: 9, charEnd: 10, start: 11.58, end: 11.92 }, // 飯
  { charStart: 10, charEnd: 11, start: 11.92, end: 12.26 }, // 店
  { charStart: 11, charEnd: 12, start: 12.26, end: 12.48 }, // 在
  { charStart: 12, charEnd: 13, start: 12.48, end: 12.78 }, // 這
  { charStart: 13, charEnd: 14, start: 12.78, end: 13.94 }, // 裡
];

test('untimed words never overlap the words being spoken', () => {
  const chunks = getWordChunks(TEXT, PINYIN, { start: 9.78, end: 13.94, chars }).filter((c) => !c.isPunctuation);
  const timed = chunks.filter((c) => typeof c.start === 'number' && typeof c.end === 'number');
  assert.equal(timed.length, chunks.length);

  // At any moment at most one word is active (start <= t < end).
  for (let t = 9.7; t < 14; t += 0.01) {
    const active = timed.filter((c) => t >= c.start! && t < c.end!);
    assert.ok(active.length <= 1, `${active.map((c) => c.text).join(' + ')} both active at ${t.toFixed(2)}s`);
  }
});

test('an unspoken stage direction before the line is never the active word', () => {
  const chunks = getWordChunks(TEXT, PINYIN, { start: 9.78, end: 13.94, chars }).filter((c) => !c.isPunctuation);
  const direction = chunks.filter((c) => '看地圖'.includes(c.text));
  assert.ok(direction.length > 0);
  for (const c of direction) assert.ok(c.end! <= c.start!, `${c.text} should have an empty range`);
});

test('a line with no timed words still spreads its words across the line', () => {
  const chunks = getWordChunks('你好嗎', 'nǐ hǎo ma', { start: 1, end: 4 }).filter((c) => !c.isPunctuation);
  assert.equal(chunks[0].start, 1);
  assert.equal(chunks[chunks.length - 1].end, 4);
});
