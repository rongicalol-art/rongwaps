import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { DictionaryExamplesPack, GenericContentManifest, SenseExampleRow } from '../../src/services/contentPacks';
import { alignSentenceSyllables } from '../../src/utils/pinyin/pinyinTones';

test('dictionary examples pack: reviewed source and shipped shards agree, pinyin lines up', () => {
  const source = readJson<{ schemaVersion: number; entries: Record<string, SenseExampleRow[]> }>('content/dictionary/senseExamples.json');
  const manifest = readJson<GenericContentManifest>('public/data/dictionary-examples/manifest.json');
  const config = PACK_CONFIGS['dictionary-examples'];
  assert.equal(config.validateManifest(manifest), true);

  const shipped = new Map<string, SenseExampleRow[]>();
  for (const part of config.getParts(manifest)) {
    const text = readSource(`public${part.path}`);
    assert.equal(createHash('sha256').update(text).digest('hex'), part.sha256, `${part.path} hash`);
    const pack = JSON.parse(text) as DictionaryExamplesPack;
    assert.equal(config.validatePack(pack, part, manifest), true, `${part.path} shape`);
    for (const [key, rows] of Object.entries(pack.items)) shipped.set(key, rows);
  }
  assert.deepEqual(Object.fromEntries([...shipped].sort(([a], [b]) => (a < b ? -1 : 1))), source.entries, 'run npm run dictionary:examples:build');

  const misaligned: string[] = [];
  for (const [key, rows] of Object.entries(source.entries)) {
    for (const [, chinese, pinyin, english, , credit] of rows) {
      assert.ok(english.trim(), `${key}: example without English`);
      if (credit) assert.match(credit, /#\d+/, `${key}: Tatoeba example without its sentence id`);
      if (!alignSentenceSyllables(chinese, pinyin)) misaligned.push(`${key}: ${chinese}`);
    }
  }
  assert.deepEqual(misaligned.slice(0, 10), [], `${misaligned.length} examples whose pinyin does not line up`);
});
