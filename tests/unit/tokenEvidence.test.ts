import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchAllTokenEvidence,
  matchTokenEvidence,
  USAGE_TOKEN_SEPARATOR as SEP,
  type TokenEvidence,
} from '../../src/utils/grammar/tokenEvidence';

const inOrder = (tokens: string[], maxGap = 3): TokenEvidence => ({ kind: 'inOrder', tokens, maxGap });
const regex = (source: string): TokenEvidence => ({ kind: 'regex', source });

test('inOrder reports the matched token span', () => {
  assert.deepEqual(matchTokenEvidence(['我', '很', '喜歡', '他'], inOrder(['很', '喜歡'])), {
    start: 1,
    end: 3,
  });
  assert.equal(matchTokenEvidence(['我', '喜歡', '他'], inOrder(['很', '喜歡'])), null);
});

test('sentenceFinal reports the final token', () => {
  assert.deepEqual(matchTokenEvidence(['你', '忙', '嗎'], { kind: 'sentenceFinal', tokens: ['嗎'] }), {
    start: 2,
    end: 3,
  });
  assert.equal(matchTokenEvidence(['嗎', '你', '忙'], { kind: 'sentenceFinal', tokens: ['嗎'] }), null);
});

test('regex matches map back to the tokens they cover', () => {
  const evidence = regex(`(?:^|${SEP})太${SEP}(?:[^${SEP}]+${SEP}){0,3}了(?:${SEP}|$)`);
  assert.deepEqual(matchTokenEvidence(['這', '太', '貴', '了'], evidence), { start: 1, end: 4 });
});

test('aNotA reports the three-token pair', () => {
  assert.deepEqual(matchTokenEvidence(['你', '去', '不', '去'], { kind: 'aNotA' }), {
    start: 1,
    end: 4,
  });
  assert.equal(matchTokenEvidence(['你', '去', '嗎'], { kind: 'aNotA' }), null);
});

test('every occurrence in one sentence is reported, not just the first', () => {
  const time = regex(`(?:^|${SEP})[0-9一二兩三四五六七八九十百千萬万幾半]+${SEP}點`);
  assert.deepEqual(
    matchAllTokenEvidence(
      ['她', '早上', '六', '點', '三十', '分', '起床', '七', '點', '去', '學校', '八', '點', '四十', '分', '上課'],
      time,
    ),
    [
      { start: 2, end: 4 },
      { start: 7, end: 9 },
      { start: 11, end: 13 },
    ],
  );
});

test('a regex that consumes its trailing separator still finds the next occurrence', () => {
  const compound = regex(`(?:^|${SEP})(?:好吃|好看)(?:${SEP}|$)`);
  assert.deepEqual(matchAllTokenEvidence(['好吃', '好看', '好玩'], compound), [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
  ]);
});

test('reduplication never crosses a clause boundary', () => {
  const evidence: TokenEvidence = { kind: 'reduplication', separators: ['一'] };
  assert.deepEqual(
    matchAllTokenEvidence(['我', '喜歡', '台灣', '台灣', '朋友'], evidence, {
      clauseStartTokens: new Set([3]),
    }),
    [],
    '台灣，台灣 is two clauses, not reduplication',
  );
  assert.deepEqual(matchAllTokenEvidence(['穿', '穿', '看'], evidence), [{ start: 0, end: 2 }]);
});

test('reduplication reports split and packed pairs', () => {
  assert.deepEqual(
    matchTokenEvidence(['穿', '穿', '看'], { kind: 'reduplication', besideAnyOf: ['看'] }),
    { start: 0, end: 2 },
  );
  assert.deepEqual(matchTokenEvidence(['看看'], { kind: 'reduplication' }), { start: 0, end: 1 });
});
