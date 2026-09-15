import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanVocabText } from '../src/utils/vocabCleaner';
import {
  packItemsToMnemonicMap,
  resolveMnemonicFromMap,
} from '../src/services/memoryHookPackService';

interface PackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: string;
}

function loadHookPack(): { items: PackItem[]; count: number } {
  const packPath = resolve(process.cwd(), 'public/data/memory-hooks/book-1.json');
  return JSON.parse(readFileSync(packPath, 'utf8')) as { items: PackItem[]; count: number };
}

function loadVocabulary(): { traditional?: string; simplified?: string }[] {
  const vocabPath = resolve(process.cwd(), 'public/data/vocabulary/book-1.json');
  return (JSON.parse(readFileSync(vocabPath, 'utf8')) as { items: unknown[] }).items as {
    traditional?: string;
    simplified?: string;
  }[];
}

const HAN_CHAR = /\p{Script=Han}/u;

test('every Book 1 vocabulary front resolves to a word hook', () => {
  const pack = loadHookPack();
  const map = packItemsToMnemonicMap(pack.items);
  const vocabulary = loadVocabulary();

  const missing: string[] = [];
  for (const item of vocabulary) {
    const front = cleanVocabText(item.traditional || item.simplified || '');
    if (!front || !HAN_CHAR.test(front)) continue;
    if (!resolveMnemonicFromMap(map, `word_${front}`)) missing.push(front);
  }

  assert.deepEqual(missing, [], `vocabulary fronts without hooks: ${missing.join(', ')}`);
});

test('multi-character word hooks name every character of the word', () => {
  const pack = loadHookPack();
  const wordItems = pack.items.filter((item) => item.content_type === 'word');

  const offenders: string[] = [];
  for (const item of wordItems) {
    const uniqueChars = [...new Set([...item.character].filter((char) => HAN_CHAR.test(char)))];
    if (uniqueChars.length < 2) continue;
    const unnamed = uniqueChars.filter((char) => !item.mnemonic.includes(char));
    if (unnamed.length > 0) offenders.push(`${item.character} (missing ${unnamed.join('')})`);
  }

  assert.deepEqual(offenders, [], `word hooks that do not name their characters: ${offenders.join(', ')}`);
});

test('word hook quality regressions stay fixed', () => {
  const pack = loadHookPack();
  const map = packItemsToMnemonicMap(pack.items);
  const hook = (key: string): string => {
    const value = resolveMnemonicFromMap(map, key);
    assert.ok(value, `missing hook for ${key}`);
    return value;
  };

  assert.match(hook('word_綠色'), /green/i);
  assert.doesNotMatch(hook('word_綠色'), /red/i);
  assert.doesNotMatch(hook('word_襪子'), /what's he/i);
  assert.doesNotMatch(hook('word_太太'), /tie-tie/i);
  assert.doesNotMatch(hook('word_希望'), /rare/i);
  assert.match(hook('word_快樂'), /pleased/i);
  assert.doesNotMatch(hook('word_醫生'), /birth/i);
  assert.doesNotMatch(hook('word_印尼'), /印度尼西亞/);

  const coverageKeys = [
    'word_想要', 'word_常常', 'word_一點兒', 'word_沒有空', 'word_裡面', 'word_外面',
    'word_上面', 'word_下面', 'word_前面', 'word_後面', 'word_電視機', 'word_有一點兒',
    'word_有的時候', 'word_車子', 'word_那麼', 'word_嘴巴', 'word_聊天兒', 'word_事情',
    'word_冷氣機', 'word_右邊', 'word_左邊', 'word_台北101',
  ];
  for (const key of coverageKeys) hook(key);
});

test('word hook pack count matches its item list', () => {
  const pack = loadHookPack();
  assert.equal(pack.count, pack.items.length);
  assert.ok(pack.items.length >= 1420);
});
