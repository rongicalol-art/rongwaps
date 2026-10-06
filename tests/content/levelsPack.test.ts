import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { GenericContentManifest, LevelIndex, LevelPack } from '../../src/services/contentPacks';

test('levels pack v2: manifest matches, transform maps characters and words to levels 1–7', () => {
  const manifest = readJson<GenericContentManifest>('public/data/levels/manifest.json');
  const config = PACK_CONFIGS.levels;
  assert.equal(config.validateManifest(manifest), true);
  const [part] = config.getParts(manifest);
  const text = readSource(`public${part.path}`);
  assert.equal(createHash('sha256').update(text).digest('hex'), manifest.shards![0].sha256);
  assert.equal(Buffer.byteLength(text), manifest.shards![0].bytes);

  const pack = JSON.parse(text) as LevelPack;
  assert.equal(pack.schemaVersion, 2);
  assert.equal(config.validatePack(pack, part, manifest), true);
  const index = config.transform!(pack) as LevelIndex;
  assert.equal(
    pack.count,
    index.tbcl.chars.size + index.tbcl.words.size + index.hsk.chars.size + index.hsk.words.size,
    'count = total entries across both sections',
  );
  assert.ok(index.tbcl.chars.size > 3000);
  assert.equal(index.tbcl.chars.get('我'), 1);
  assert.equal(index.tbcl.words.get('爸爸'), 1);
  assert.equal(index.tbcl.words.get('爸'), 1, 'alternative forms (爸爸/爸) share the level');
  for (const section of [index.tbcl, index.hsk]) {
    for (const level of [...section.chars.values(), ...section.words.values()]) assert.ok(level >= 1 && level <= 7);
  }
  for (const form of index.hsk.words.keys()) assert.ok(!index.tbcl.words.has(form), `hsk word ${form} duplicates TBCL`);
  for (const char of index.hsk.chars.keys()) assert.ok(!index.tbcl.chars.has(char), `hsk char ${char} duplicates TBCL`);
});
