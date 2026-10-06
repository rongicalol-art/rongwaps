import assert from 'node:assert/strict';
import test from 'node:test';
import { getFocusTokenIds } from '../../src/screens/grammar-lesson/utils/grammarFocusTokens';
import type { GrammarWordToken } from '../../src/types/models';

const tokens = (...texts: string[]): GrammarWordToken[] =>
  texts.map((traditional, i) => ({ id: `t${i}`, traditional, pinyin: '', meaning: '' }) as GrammarWordToken);
const texts = (words: GrammarWordToken[], ids: Set<string>) => words.filter((w) => ids.has(w.id)).map((w) => w.traditional);

test('a negator joins the grammar word it precedes', () => {
  const words = tokens('她', '不', '是', '臺灣', '人');
  assert.deepEqual(texts(words, getFocusTokenIds(words, ['是'], 'traditional')), ['不', '是']);
});

test('multi-character patterns match across smaller tokens', () => {
  const words = tokens('老師', '忙', '不', '忙');
  assert.deepEqual(texts(words, getFocusTokenIds(words, ['忙不忙'], 'traditional')), ['忙', '不', '忙']);
});

test('English teaching labels are ignored', () => {
  const words = tokens('我', '愛', '你');
  assert.deepEqual(texts(words, getFocusTokenIds(words, ['subject → verb', '愛'], 'traditional')), ['愛']);
});

test('simplified preference matches simplified terms', () => {
  const words = [{ id: 'a', traditional: '沒有', simplified: '没有', pinyin: '', meaning: '' }] as GrammarWordToken[];
  assert.equal(getFocusTokenIds(words, ['没有'], 'simplified').size, 1);
  assert.equal(getFocusTokenIds(words, ['没有'], 'traditional').size, 0);
});
