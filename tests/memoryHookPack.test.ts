import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidMemoryHookItem,
  isValidMemoryHookPack,
  packItemsToMnemonicMap,
  resolveMnemonicFromMap,
} from '../src/services/memoryHookPackService';
import { BUNDLED_EXTRA_GLYPHS } from '../scripts/memory-hooks/checkHookQuality';

interface PackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: string;
}

const item = {
  id: '媽',
  character: '媽',
  mnemonic: 'The 女(woman) gives the meaning, while 馬(horse) is the sound component (mǎ -> mā): 媽 means mother.',
  content_type: 'character',
};

test('memory hook items accept character and word entries', () => {
  assert.equal(isValidMemoryHookItem(item), true);
  assert.equal(isValidMemoryHookItem({ ...item, id: 'word_老師', content_type: 'word' }), true);
  assert.equal(isValidMemoryHookItem({ ...item, mnemonic: '' }), false);
  assert.equal(isValidMemoryHookItem({ ...item, content_type: 'sentence' }), false);
  assert.equal(isValidMemoryHookItem(null), false);
});

test('memory hook packs must match book, count, and item shape', () => {
  const pack = { schemaVersion: 1, bookId: 1, count: 2, items: [item, { ...item, id: '門', character: '門' }] };
  assert.equal(isValidMemoryHookPack(pack, 1, 2), true);
  assert.equal(isValidMemoryHookPack(pack, 2, 2), false);
  assert.equal(isValidMemoryHookPack(pack, 1, 3), false);
  assert.equal(isValidMemoryHookPack({ ...pack, schemaVersion: 2 }, 1, 2), false);
  assert.equal(isValidMemoryHookPack({ ...pack, items: [item] }, 1, 2), false);
});

test('pack items map to mnemonic cache keys', () => {
  const map = packItemsToMnemonicMap([item, { ...item, id: 'word_老師', character: '老師', content_type: 'word' }]);
  assert.equal(map.get('媽'), item.mnemonic);
  assert.equal(map.get('word_老師'), item.mnemonic);
  assert.equal(map.get('missing'), undefined);
});

test('resolveMnemonicFromMap supports direct matches and resilient single-character fallback', () => {
  const map = packItemsToMnemonicMap([
    item, // id: '媽' (no word_ prefix in map)
    { id: 'word_好', character: '好', mnemonic: 'A 女(woman) with her 子(child) means good.', content_type: 'word' },
    { id: 'word_老師', character: '老師', mnemonic: 'Teacher mnemonic', content_type: 'word' },
  ]);

  // Direct hits
  assert.equal(resolveMnemonicFromMap(map, '媽'), item.mnemonic);
  assert.equal(resolveMnemonicFromMap(map, 'word_好'), 'A 女(woman) with her 子(child) means good.');

  // Single-character fallbacks
  // Looking up 'word_媽' falls back to '媽'
  assert.equal(resolveMnemonicFromMap(map, 'word_媽'), item.mnemonic);
  // Looking up '好' falls back to 'word_好'
  assert.equal(resolveMnemonicFromMap(map, '好'), 'A 女(woman) with her 子(child) means good.');

  // Multi-character word does NOT fall back
  assert.equal(resolveMnemonicFromMap(map, '老師'), null);
  assert.equal(resolveMnemonicFromMap(map, 'word_unknown'), null);
  assert.equal(resolveMnemonicFromMap(map, 'unknown'), null);
});

test('production book-1 memory hook pack is device-safe, explicitly names sound components, and is semantically verified', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const packPath = resolve(process.cwd(), 'public/data/memory-hooks/book-1.json');
  const raw = JSON.parse(readFileSync(packPath, 'utf8')) as { schemaVersion: number; bookId: number; items: PackItem[] };

  assert.equal(raw.schemaVersion, 1);
  assert.equal(raw.bookId, 1);
  assert.ok(raw.items.length >= 656);

  const charItems = raw.items.filter((i) => i.content_type === 'character');
  assert.equal(charItems.length, 656);

  const vaguePhoneticPattern = /\b(sounds like|just sounds like|even sounds like|echoes the sound of|echoes|puffs the sound|sounds like 'fee'|is only a sound cue|lending its cool sound)\b/i;

  for (const item of charItems) {
    assert.ok(item.mnemonic.length >= 15, `${item.character} hook is too short`);
    // Non-BMP component tokens are allowed only when the glyph is bundled in
    // the RW-Extras webfont (public/fonts/rw-extras*.woff2); anything else
    // risks tofu on a device without CJK Ext-B coverage.
    const unbundledNonBmp = [...item.mnemonic].filter((c: string) => c.codePointAt(0)! > 0xFFFF && !BUNDLED_EXTRA_GLYPHS.has(c));
    assert.equal(
      unbundledNonBmp.length,
      0,
      `${item.character} contains non-BMP characters outside the bundled extras font: ${unbundledNonBmp.join(' ')}`,
    );

    // Zero vague sound expressions allowed
    assert.ok(
      !vaguePhoneticPattern.test(item.mnemonic),
      `${item.character} must not use vague phonetic phrasing: ${item.mnemonic}`
    );
  }

  // Verify explicit sound cue mentions with pinyin for key phono-semantic characters
  const soundCuePattern = /\b(sound component|sound cue|lends the sound|sound shifts)\b/i;
  const soundComponentChecks = [
    { char: '媽', from: 'mǎ', to: 'mā' },
    { char: '爸', from: 'bā', to: 'bà' },
    { char: '請', from: 'qīng', to: 'qǐng' },
    { char: '客', from: 'gè', to: 'kè' },
    { char: '喝', from: 'hé', to: 'hē' },
    { char: '城', from: 'chéng' },
    { char: '湖', from: 'hú' },
    { char: '花', from: 'huà', to: 'huā' },
    { char: '問', from: 'mén', to: 'wèn' },
  ];
  for (const { char, from, to } of soundComponentChecks) {
    const entry = charItems.find((i) => i.character === char);
    assert.ok(entry, `Character ${char} must exist in pack`);
    assert.match(
      entry.mnemonic,
      soundCuePattern,
      `${char} hook must explicitly name its sound cue: ${entry.mnemonic}`,
    );
    assert.ok(
      entry.mnemonic.includes(from),
      `${char} hook must include the source pinyin '${from}': ${entry.mnemonic}`,
    );
    if (to) {
      assert.ok(
        entry.mnemonic.includes(to),
        `${char} hook must include the target pinyin '${to}': ${entry.mnemonic}`,
      );
    }
  }

  const ni = charItems.find((i) => i.character === '尼');
  assert.ok(ni && !ni.mnemonic.includes('corpse') && !ni.mnemonic.includes('dead'), '尼 must not contain macabre imagery');

  const qi = charItems.find((i) => i.character === '淇');
  assert.ok(qi && qi.mnemonic.includes('ice cream'), '淇 must connect to ice cream');

  const dan = charItems.find((i) => i.character === '但');
  assert.ok(dan && !dan.mnemonic.includes('"dawn"'), '但 must not equate dàn with English dawn');

  const gei = charItems.find((i) => i.character === '給');
  assert.ok(gei && gei.mnemonic.toLowerCase().includes('give'), '給 must include give');
});
