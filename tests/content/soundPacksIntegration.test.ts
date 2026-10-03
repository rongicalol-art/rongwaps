import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import {
  type SoundHookPack,
  type SoundFamiliesPack,
  isValidSoundHookPack,
  isValidSoundFamiliesPack,
} from '../../src/services/contentPacks';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';

test('Integration: sound-hooks transform indexes all 4 books correctly', () => {
  const allEntries = new Map<string, unknown>();

  for (let b = 1; b <= 4; b++) {
    const pack = readJson<SoundHookPack>(`public/data/sound-hooks/book-${b}.json`);
    assert.equal(isValidSoundHookPack(pack, b, pack.count), true);
    const transform = PACK_CONFIGS['sound-hooks'].transform;
    assert.ok(transform, 'sound-hooks config must have transform function');
    const mapped = transform(pack) as Map<string, { character: string; phonetic: { glyph: string; reading: string; shift: string } | null; family: unknown[] }>;
    for (const [char, entry] of mapped.entries()) {
      assert.ok(!allEntries.has(char), `character ${char} duplicated across book packs`);
      allEntries.set(char, entry);
    }
  }

  assert.equal(allEntries.size, 1677, 'total unique characters across books 1-4 must equal 1677');

  // Verify Book 1 repaired items
  const star = allEntries.get('星') as { phonetic: { glyph: string; shift: string } };
  assert.ok(star, '星 must be in pack');
  assert.equal(star.phonetic?.glyph, '生');
  assert.equal(star.phonetic?.shift, 'shēng → xīng');

  const shop = allEntries.get('店') as { phonetic: { glyph: string; shift: string } };
  assert.ok(shop, '店 must be in pack');
  assert.equal(shop.phonetic?.glyph, '占');
  assert.equal(shop.phonetic?.shift, 'zhàn → diàn');

  // Verify Book 2 items
  const taste = allEntries.get('嚐') as { pinyin: string };
  assert.ok(taste, '嚐 must be in Book 2 pack');
  assert.equal(taste.pinyin, 'cháng');

  // Verify Book 3 items
  const wet = allEntries.get('溼') as { pinyin: string };
  assert.ok(wet, '溼 must be in Book 3 pack');
  assert.equal(wet.pinyin, 'shī');

  // Verify Book 4 items
  const pollute = allEntries.get('汙') as { pinyin: string };
  assert.ok(pollute, '汙 must be in Book 4 pack');
  assert.equal(pollute.pinyin, 'wū');
});

test('Integration: sound-families transform indexes global series into fast character lookup', () => {
  const pack = readJson<SoundFamiliesPack>('public/data/sound-families/series.json');
  assert.equal(isValidSoundFamiliesPack(pack), true);

  const transform = PACK_CONFIGS['sound-families'].transform;
  assert.ok(transform, 'sound-families config must have transform function');
  const mapped = transform(pack) as Map<string, { glyph: string; reading: string; family: Array<{ character: string; pinyin: string; reading: string }> }>;

  assert.ok(mapped.size > 3000, 'global lookup map must cover thousands of characters');

  // Test character lookup in global series
  const pao = mapped.get('跑');
  assert.ok(pao, '跑 must be in global sound families');
  assert.equal(pao.glyph, '包');
  assert.equal(pao.reading, 'bāo');
  const paoFamily = pao.family.map((f) => f.character);
  assert.ok(paoFamily.includes('抱'), '跑 family must include 抱');
  assert.ok(paoFamily.includes('泡'), '跑 family must include 泡');
  assert.ok(paoFamily.includes('胞'), '跑 family must include 胞');

  const qing = mapped.get('請');
  assert.ok(qing, '請 must be in global sound families');
  assert.equal(qing.glyph, '青');
  assert.equal(qing.reading, 'qīng');
  const qingFamily = qing.family.map((f) => f.character);
  assert.ok(qingFamily.includes('情'), '請 family must include 情');
  assert.ok(qingFamily.includes('清'), '請 family must include 清');
  assert.ok(qingFamily.includes('睛'), '請 family must include 睛');
});
