import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowWordHook, wordMnemonicKey } from '../src/features/character-memory-hooks/wordHook';

test('word mnemonic keys mirror the mnemonic cache format', () => {
  assert.equal(wordMnemonicKey('老師'), 'word_老師');
  assert.equal(wordMnemonicKey('東西'), 'word_東西');
});

test('word hooks are offered for Chinese words and characters', () => {
  assert.equal(shouldShowWordHook('老師'), true);
  assert.equal(shouldShowWordHook('東西'), true);
  assert.equal(shouldShowWordHook('媽'), true);
  assert.equal(shouldShowWordHook('A'), false);
  assert.equal(shouldShowWordHook(''), false);
  assert.equal(shouldShowWordHook('你好吗'), true);
});
