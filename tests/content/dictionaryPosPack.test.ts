import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { DictionaryPosPack, GenericContentManifest } from '../../src/services/contentPacks';
import { POS_INFO } from '../../src/data/posInfo';
import { DICTIONARY_SHARD_COUNT } from '../../shared/dictionaryShard';
import { posTagsKey } from '../../shared/dictionarySearch';
import { readingDictionarySenses, readingKey, senseTags } from '../../src/utils/vocabulary/wordEntry';

type ShardTuple = [number, string, string, string, string[]];

test('word-type pack: reviewed source, shipped shards and the dictionary agree', () => {
  const source = readJson<{ schemaVersion: number; entries: Record<string, string> }>('content/dictionary/posTags.json');
  const manifest = readJson<GenericContentManifest>('public/data/dictionary-pos/manifest.json');
  const config = PACK_CONFIGS['dictionary-pos'];
  assert.equal(config.validateManifest(manifest), true);

  // The shards are exactly the reviewed source.
  const shipped = new Map<string, string>();
  for (const part of config.getParts(manifest)) {
    const text = readSource(`public${part.path}`);
    assert.equal(createHash('sha256').update(text).digest('hex'), part.sha256, `${part.path} hash`);
    const pack = JSON.parse(text) as DictionaryPosPack;
    assert.equal(config.validatePack(pack, part, manifest), true, `${part.path} shape`);
    for (const [key, value] of Object.entries(pack.items)) shipped.set(key, value);
  }
  assert.deepEqual(Object.fromEntries([...shipped].sort(([a], [b]) => (a < b ? -1 : 1))), source.entries, 'run npm run dictionary:pos:build');

  // Every entry still matches the dictionary's senses for its reading (as the word page builds them).
  const words = new Set(Object.keys(source.entries).map((key) => key.slice(0, key.indexOf('|'))));
  const rowsByWord = new Map<string, Array<{ id: number; traditional: string; pinyin_accented: string; definitions: string[] }>>();
  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const pack = readJson<{ items: ShardTuple[] }>(`public/data/dictionary/shard-${String(shard).padStart(2, '0')}.json`);
    for (const [id, simplified, traditional, pinyin, definitions] of pack.items) {
      const word = traditional || simplified;
      if (words.has(word)) rowsByWord.set(word, [...(rowsByWord.get(word) ?? []), { id, traditional: word, pinyin_accented: pinyin, definitions }]);
    }
  }
  const stale: string[] = [];
  for (const [key, value] of Object.entries(source.entries)) {
    const wordRows = rowsByWord.get(key.slice(0, key.indexOf('|'))) ?? [];
    const row = wordRows.find((item) => posTagsKey(item.traditional, item.pinyin_accented) === key);
    const readingRows = row ? wordRows.filter((item) => readingKey(item.pinyin_accented) === readingKey(row.pinyin_accented)) : [];
    const tags = senseTags(value, readingDictionarySenses(readingRows).senses);
    if (!tags) { stale.push(key); continue; }
    for (const tag of tags) if (tag) assert.ok(POS_INFO[tag], `${key}: unknown word type ${tag}`);
  }
  assert.deepEqual(stale.slice(0, 10), [], `${stale.length} word-type entries no longer match the dictionary's senses`);
  assert.ok(Object.keys(source.entries).length > 15_000, 'learner words are covered');
});
