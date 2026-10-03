import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { isValidSoundHookPack, type SoundHookPack } from '../../src/services/contentPacks';

interface SoundManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string; sha256: string; bytes: number }>;
}

const MANIFEST = readJson<SoundManifest>('public/data/sound-hooks/manifest.json');
const PACK_TEXT = readSource('public/data/sound-hooks/book-1.json');
const PACK = JSON.parse(PACK_TEXT) as SoundHookPack;

test('Sound pack: manifest hash, count, and schema match across all books', () => {
  assert.equal(MANIFEST.schemaVersion, 1);
  assert.equal(MANIFEST.totalCount, 1677);
  assert.equal(MANIFEST.books.length, 4);

  for (const book of MANIFEST.books) {
    const packText = readSource(`public/data/sound-hooks/book-${book.bookId}.json`);
    assert.equal(createHash('sha256').update(packText).digest('hex'), book.sha256);
    assert.equal(book.bytes, Buffer.byteLength(packText));
    const pack = JSON.parse(packText) as SoundHookPack;
    assert.equal(isValidSoundHookPack(pack, book.bookId, book.count), true);
  }
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

test('Sound pack: newly repaired Book 1 phono-semantic characters carry phonetic cues', () => {
  const repaired = [
    { character: '星', glyph: '生', reading: 'shēng', shift: 'shēng → xīng' },
    { character: '海', glyph: '每', reading: 'měi', shift: 'měi → hǎi' },
    { character: '作', glyph: '乍', reading: 'zhà', shift: 'zhà → zuò' },
    { character: '昨', glyph: '乍', reading: 'zhà', shift: 'zhà → zuó' },
    { character: '姓', glyph: '生', reading: 'shēng', shift: 'shēng → xìng' },
    { character: '課', glyph: '果', reading: 'guǒ', shift: 'guǒ → kè' },
    { character: '答', glyph: '合', reading: 'hé', shift: 'hé → dá' },
    { character: '店', glyph: '占', reading: 'zhàn', shift: 'zhàn → diàn' },
  ];
  for (const entry of repaired) {
    const item = PACK.items.find((candidate) => candidate.character === entry.character);
    assert.ok(item, `${entry.character} missing from book 1`);
    assert.ok(item.phonetic, `${entry.character} must carry a phonetic piece`);
    assert.equal(item.phonetic.glyph, entry.glyph);
    assert.equal(item.phonetic.reading, entry.reading);
    assert.equal(item.phonetic.shift, entry.shift);
    assert.equal(item.needsHuman, false);
  }
});

test('Sound pack: families list siblings sharing the phonetic piece', () => {
  const qing = PACK.items.find((item) => item.character === '請');
  assert.ok(qing);
  const family = qing.family.map((member) => member.character);
  assert.ok(family.includes('情'), '請 family must include 情');
  assert.ok(family.includes('睛'), '請 family must include 睛');
  assert.ok(!family.includes('請'), 'family must not include the character itself');

  // Verify series root '家' has phonetic: null and lists its children
  const jia = PACK.items.find((item) => item.character === '家');
  assert.ok(jia, '家 must be in Book 1 pack');
  assert.equal(jia.phonetic, null, '家 is an ideograph root, phonetic must be null');
  const jiaFamily = jia.family.map((m) => m.character);
  assert.ok(jiaFamily.includes('嫁'), '家 family must include 嫁');
  assert.ok(!jiaFamily.includes('家'), 'family must not include 家 itself');
  assert.ok(!jiaFamily.includes('逐'), 'family must not include unrelated 逐');

  // Verify derivative '嫁' in Book 4 has phonetic '家' and lists '家' in its family
  const pack4Text = readSource('public/data/sound-hooks/book-4.json');
  const pack4 = JSON.parse(pack4Text) as SoundHookPack;
  const jia4 = pack4.items.find((item) => item.character === '嫁');
  assert.ok(jia4, '嫁 must be in Book 4 pack');
  assert.equal(jia4.phonetic?.glyph, '家', '嫁 phonetic glyph must be 家');
  assert.equal(jia4.phonetic?.reading, 'jiā', '嫁 phonetic reading must be jiā');
  const jia4Family = jia4.family.map((m) => m.character);
  assert.ok(jia4Family.includes('家'), '嫁 family must include the root character 家');
  assert.ok(!jia4Family.includes('嫁'), 'family must not include 嫁 itself');
});

test('Sound pack: multi-book coverage for Books 2, 3, 4', () => {
  for (let b = 2; b <= 4; b++) {
    const packText = readSource(`public/data/sound-hooks/book-${b}.json`);
    const pack = JSON.parse(packText) as SoundHookPack;
    assert.ok(pack.items.length > 200, `Book ${b} must have at least 200 items`);
    const withPhonetic = pack.items.filter((item) => item.phonetic !== null);
    assert.ok(withPhonetic.length > 100, `Book ${b} must have phono-semantic coverage`);
    const withFamily = pack.items.filter((item) => item.family.length > 0);
    assert.ok(withFamily.length > 100, `Book ${b} must have sound family members`);
  }
});

test('Sound pack: every entry has a pinyin and no mnemonic content', () => {
  for (let b = 1; b <= 4; b++) {
    const packText = readSource(`public/data/sound-hooks/book-${b}.json`);
    const pack = JSON.parse(packText) as SoundHookPack;
    for (const item of pack.items) {
      assert.ok(item.pinyin.length > 0, `${item.character} in book ${b} missing pinyin`);
      assert.equal(typeof item.needsHuman, 'boolean');
      assert.ok(!('mnemonic' in item), 'sound entries must not carry mnemonics');
    }
  }
});
