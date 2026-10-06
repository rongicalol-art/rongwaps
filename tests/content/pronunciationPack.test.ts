import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { GenericContentManifest, PronunciationPack } from '../../src/services/contentPacks';
import type { ReadingsIndex } from '../../src/utils/pronunciation';

test('pronunciation pack: manifest matches and readings are Taiwan-first', () => {
  const manifest = readJson<GenericContentManifest>('public/data/pronunciation/manifest.json');
  const config = PACK_CONFIGS.pronunciation;
  assert.equal(config.validateManifest(manifest), true);
  const [part] = config.getParts(manifest);
  const text = readSource(`public${part.path}`);
  assert.equal(createHash('sha256').update(text).digest('hex'), manifest.shards![0].sha256);
  assert.equal(Buffer.byteLength(text), manifest.shards![0].bytes);

  const pack = JSON.parse(text) as PronunciationPack;
  assert.equal(config.validatePack(pack, part, manifest), true);
  const index = config.transform!(pack) as ReadingsIndex;
  assert.ok(index.size > 9000);
  const pinyin = (char: string) => index.get(char)?.map((reading) => reading.pinyin);
  assert.deepEqual(pinyin('誰'), ['shéi', 'shuí'], 'course reading leads; "also pr." is a variant');
  assert.equal(index.get('誰')?.[1].kind, 'variant');
  assert.equal(pinyin('期')?.[0], 'qí', 'Taiwan pr. replaces the mainland reading');
  assert.equal(pinyin('妳')?.[0], 'nǐ', 'variant-of pointers (妳 nǎi) never lead');
  assert.ok(pinyin('行')?.includes('háng') && pinyin('長')?.includes('zhǎng'), 'different-meaning readings are kept');
  assert.ok(index.get('長')?.find((reading) => reading.pinyin === 'zhǎng')?.example, 'other readings carry an example word');
  for (const readings of index.values()) assert.equal(readings[0].kind, 'primary');
});
