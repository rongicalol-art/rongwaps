import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { isValidSoundHookPack, type SoundHookPack } from '../src/services/soundHookPack';

interface SoundManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string; sha256: string; bytes: number }>;
}

const SOUND_DIR = resolve(process.cwd(), 'public/data/sound-hooks');
const MANIFEST = JSON.parse(readFileSync(resolve(SOUND_DIR, 'manifest.json'), 'utf8')) as SoundManifest;
const PACK_TEXT = readFileSync(resolve(SOUND_DIR, 'book-1.json'), 'utf8');
const PACK = JSON.parse(PACK_TEXT) as SoundHookPack;

test('Sound pack: manifest hash, count, and schema match', () => {
  assert.equal(MANIFEST.schemaVersion, 1);
  assert.equal(MANIFEST.totalCount, 656);
  const book = MANIFEST.books.find((entry) => entry.bookId === 1);
  assert.ok(book, 'manifest must list book 1');
  assert.equal(createHash('sha256').update(PACK_TEXT).digest('hex'), book.sha256);
  assert.equal(book.bytes, Buffer.byteLength(PACK_TEXT));
  assert.equal(isValidSoundHookPack(PACK, 1, 656), true);
});

test('Sound pack: approved phono-semantic characters carry their piece, reading, and shift', () => {
  const expected = [
    { character: '媽', glyph: '馬', reading: 'mǎ', shift: 'mǎ → mā' },
    { character: '爸', glyph: '巴', reading: 'bā', shift: 'bā → bà' },
    { character: '請', glyph: '青', reading: 'qīng', shift: 'qīng → qǐng' },
    { character: '客', glyph: '各', reading: 'gè', shift: 'gè → kè' },
    { character: '喝', glyph: '曷', reading: 'hé', shift: 'hé → hē' },
    { character: '城', glyph: '成', reading: 'chéng', shift: 'chéng' },
    { character: '湖', glyph: '胡', reading: 'hú', shift: 'hú' },
    { character: '花', glyph: '化', reading: 'huà', shift: 'huà → huā' },
    { character: '問', glyph: '門', reading: 'mén', shift: 'mén → wèn' },
  ];
  for (const entry of expected) {
    const item = PACK.items.find((candidate) => candidate.character === entry.character);
    assert.ok(item, `${entry.character} missing from the sound pack`);
    assert.ok(item.phonetic, `${entry.character} must carry a phonetic piece`);
    assert.equal(item.phonetic.glyph, entry.glyph);
    assert.equal(item.phonetic.reading, entry.reading);
    assert.equal(item.phonetic.shift, entry.shift);
  }
});

test('Sound pack: families list siblings sharing the phonetic piece', () => {
  const qing = PACK.items.find((item) => item.character === '請');
  assert.ok(qing);
  const family = qing.family.map((member) => member.character);
  assert.ok(family.includes('情'), '請 family must include 情');
  assert.ok(family.includes('睛'), '請 family must include 睛');
  assert.ok(!family.includes('請'), 'family must not include the character itself');
});

test('Sound pack: every entry has a pinyin and no mnemonic content', () => {
  for (const item of PACK.items) {
    assert.ok(item.pinyin.length > 0, `${item.character} missing pinyin`);
    assert.equal(typeof item.needsHuman, 'boolean');
    assert.ok(!('mnemonic' in item), 'sound entries must not carry mnemonics');
  }
});
