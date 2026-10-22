import { mock } from 'node:test';
import { readFile } from 'node:fs/promises';
import { getCourseVocabLookupMap } from '../../src/services/courseVocabLookup';
import { getDictionaryShard } from '../../shared/dictionaryShard';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lookupSentenceWord,
  validateSentenceWords,
} from '../../src/services/sentenceLookupService';

test.after(() => mock.restoreAll());
test.before(async () => {
  await getCourseVocabLookupMap();
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), '/api/dictionary/lookup');
    const { words } = JSON.parse(String(init?.body)) as { words: string[] };
    const result: Record<string, unknown[]> = {};
    for (const word of words) {
      const pack = JSON.parse(await readFile(`public/data/dictionary/shard-${String(getDictionaryShard(word)).padStart(2, '0')}.json`, 'utf8')) as { items: [number, string, string, string, unknown][] };
      result[word] = pack.items.filter(([, s, t]) => s === word || t === word).map(([id, simplified, traditional, pinyin_accented, definitions]) => ({
        id, simplified, traditional: traditional || simplified, pinyin_accented, definitions,
      }));
    }
    return Response.json(result);
  });
});

test('sentenceLookup: validates known words in batch', async () => {
  const words = ['你好', '謝謝', 'nonexistentwordxyz123'];
  const validSet = await validateSentenceWords(words);

  assert.ok(validSet.has('你好'));
  assert.ok(!validSet.has('nonexistentwordxyz123'));
});

test('sentenceLookup: looks up dictionary word with pinyin and sanitized definitions', async () => {
  const result = await lookupSentenceWord('你好');

  assert.ok(result !== null);
  assert.equal(result.word, '你好');
  assert.ok(result.definitions.length > 0);
  assert.ok(result.pinyin && result.pinyin.length > 0);
});

test('sentenceLookup: decomposes an unlisted question into meaningful parts', async () => {
  // A phrase or compound with no single dictionary entry (e.g. A-not-A question form)
  const result = await lookupSentenceWord('忙不忙');

  assert.ok(result !== null);
  assert.equal(result.word, '忙不忙');
  assert.ok(result.fallbackParts && result.fallbackParts.length >= 2);
  assert.equal(result.fallbackParts.map(part => part.word).join(''), '忙不忙');
  assert.ok(result.fallbackParts.every(part => part.definition || part.pinyin));
});

test('sentenceLookup: handles empty or unknown input gracefully', async () => {
  const empty = await lookupSentenceWord('');
  assert.equal(empty, null);

  const unknown = await lookupSentenceWord('𠀀');
  assert.ok(unknown !== null);
  assert.equal(unknown.word, '𠀀');
  assert.equal(unknown.definitions.length, 0);
});

test('sentenceLookup: authored meaning wins without contaminating later lookups', async () => {
  const contextual = await lookupSentenceWord('也', 'traditional', { pinyin: 'ye3', meaning: 'also (in this sentence)' });
  assert.equal(contextual?.pinyin, 'yě');
  assert.deepEqual(contextual?.definitions, ['also (in this sentence)']);
  const generic = await lookupSentenceWord('也');
  assert.ok(generic?.definitions.length);
  assert.ok(!generic.definitions.includes('also (in this sentence)'));
});

test('sentenceLookup: unknown phrase preserves known compounds in fallback', async () => {
  const result = await lookupSentenceWord('也把電腦');
  assert.ok(result?.fallbackParts?.some(part => part.word === '電腦' && part.definition));
  assert.ok(!result?.definitions.length);
});


test('sentenceLookup: batch validation preserves alternate dictionary readings', async () => {
  await validateSentenceWords(['行']);
  const result = await lookupSentenceWord('行', 'traditional', { pinyin: 'hang2' });
  assert.equal(result?.pinyin, 'háng');
  assert.ok(result?.definitions.some(definition => /row|profession|line|trade/i.test(definition)));
});
