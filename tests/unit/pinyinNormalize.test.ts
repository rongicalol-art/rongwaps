import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expandOptionalGroups,
  expandSlashAndOptionalVariants,
  stripPinyinTones,
} from '../../src/utils/pinyinNormalize';

test('stripPinyinTones folds tones, numbers, umlauts, and separators', () => {
  assert.equal(stripPinyinTones('Nǐ hǎo!'), 'nihao');
  assert.equal(stripPinyinTones('lǜshī'), 'lushi');
  assert.equal(stripPinyinTones('lu:shi'), 'lushi');
  assert.equal(stripPinyinTones('lv3'), 'lu');
  assert.equal(stripPinyinTones(''), '');
});

test('expandOptionalGroups yields every combination recursively', () => {
  assert.deepEqual(
    expandOptionalGroups('(yì)diǎn(r)').sort(),
    ['diǎn', 'diǎnr', 'yìdiǎn', 'yìdiǎnr'],
  );
  assert.deepEqual(
    expandOptionalGroups('（一）點（兒）').sort(),
    ['一點', '一點兒', '點', '點兒'],
  );
});

test('expandSlashAndOptionalVariants splits alternates and dedupes', () => {
  assert.deepEqual(expandSlashAndOptionalVariants('你好/妳好'), ['你好', '妳好']);
  assert.deepEqual(expandSlashAndOptionalVariants('你好／妳好'), ['你好', '妳好']);
  assert.deepEqual(expandSlashAndOptionalVariants(' 想（要） '), ['想', '想要']);
  assert.deepEqual(expandSlashAndOptionalVariants(''), []);
});
