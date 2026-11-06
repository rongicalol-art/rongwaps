import assert from 'node:assert/strict';
import test from 'node:test';
import { grammarKeys } from '../../scripts/dictionary/buildUsagePack';

const WORDS = new Set(['叫', '姓', '是', '很', '不', '了', '就', '時候', '對', '到', '一', '都', '也', '更', '別說', '把', '完', '只要', '要是', '如果', '從', '往']);
const isWord = (text: string) => WORDS.has(text);

test('a grammar point links the words it is about', () => {
  assert.deepEqual(grammarKeys('叫、姓、是', ['叫', '姓', '是', '不'], isWord), ['叫', '姓', '是']);
  assert.deepEqual(grammarKeys('要是／如果……，就……', ['如果', '要是', '就'], isWord).sort(), ['如果', '就', '要是']);
  assert.deepEqual(grammarKeys('只要……就……', undefined, isWord), ['只要', '就']);
});

test('a title read through its head, never its form list, options or grammar labels', () => {
  assert.deepEqual(grammarKeys('V到：V到了／沒V到／V得到／V不到', undefined, isWord), ['到']);
  assert.deepEqual(grammarKeys('（有）多+Vs', undefined, (text) => text === '多' || isWord(text)), ['多']);
  assert.deepEqual(grammarKeys('時量', ['八個小時', '的', '鐘頭'], isWord), []);
  assert.deepEqual(grammarKeys('從起點到終點', ['從', '到', '來', '去'], isWord), ['從', '到']);
});

test('a glue word links only when the point is about it', () => {
  // Named on its own in the focus terms: the point is about 都.
  assert.deepEqual(grammarKeys('一組人／物 + 都 + 動作／描述', ['都'], isWord), ['都']);
  // Only inside a longer pattern: 更別說……了 is not a 了 point.
  assert.deepEqual(grammarKeys('更別說……了', ['更別說', '更別說……了'], isWord), []);
  // Book 2 (no focus terms): a glue word counts when the title leads with it or lists it alone.
  assert.deepEqual(grammarKeys('把+N+V了', undefined, isWord), ['把']);
  assert.deepEqual(grammarKeys('很／不', undefined, isWord), ['很', '不']);
});

test('a title word with one glue character links the word inside it', () => {
  assert.deepEqual(grammarKeys('的時候', ['的時候'], isWord), ['時候']);
  // 來說 is no word, and nothing but its first character would be: no link rather than a wrong one.
  assert.deepEqual(grammarKeys('對 NP 來說', undefined, isWord), ['對']);
});
