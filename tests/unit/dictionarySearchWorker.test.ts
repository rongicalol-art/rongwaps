import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDictionaryIndex } from '../../shared/dictionaryIndex';
import { searchInIndex, type CompactSearchEntry } from '../../shared/dictionarySearch';

test('indexed candidates preserve ranking, tones, initialisms, synonyms and typo fallback', async () => {
  const { items } = JSON.parse(await readFile('public/data/search/dictionary-search-index.json', 'utf8')) as { items: CompactSearchEntry[] };
  const index = createDictionaryIndex(items);
  for (const query of ['老師', '學', '圖書館', '你好', 'teacher', 'procrastination', 'went', 'put off', 'take care', 'nh', 'tyz', 'ni3 hao3', 'lǎo', 'laoshi', 'wohenlei', 'procrastinatoin', 'bu好', '*好', 'xue*']) {
    assert.deepEqual(index.search(query), searchInIndex(items, query), `ranking changed for ${query}`);
  }
  for (const query of ['老師', 'teacher', 'procrastination']) {
    assert.ok(index.candidates(query).length < items.length / 5, `index must substantially reduce scanning for ${query}`);
  }
});
