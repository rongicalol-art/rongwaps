import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  pos: string | null;
  audio: string | null;
  examples: string | null;
}

interface VocabularyPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: VocabularyRow[];
}

const VOCAB_DIR = resolve(process.cwd(), 'public/data/vocabulary');
const MANIFEST = JSON.parse(readFileSync(resolve(VOCAB_DIR, 'manifest.json'), 'utf8')) as {
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string; sha256: string; bytes: number }>;
};

const HAN = /\p{Script=Han}/u;
const PINYIN_CHARSET = /^[\p{Script=Latin}\s/()?,、…0-9'’-]*$/u;
const TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ]/;
const NEUTRAL_TONE_WORDS = new Set(['嗎', '呢', '的', '個', '了', '吧', '得', '著', '地', '嘛', '啦', '哇', '哪', '嘍']);
const POS_ATOMS = new Set([
  'N', 'V', 'Vi', 'Vst', 'Vs', 'Vaux', 'Vp', 'Vpt', 'Vs-pred', 'Vs-attr', 'Vs-sep', 'V-sep', 'Vp-sep',
  'Adv', 'Det', 'Ptc', 'Ph', 'Conj', 'Prep', 'M', 'Name', 'Suf',
]);
const MEASURE_WORD_PINYIN = /[\p{Script=Han}]+ [A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ]+/u;
const MEASURE_WORD_SEGMENT = new RegExp(`^M: ${MEASURE_WORD_PINYIN.source}(, ${MEASURE_WORD_PINYIN.source})*$`, 'u');

function loadPack(book: { path: string; sha256: string }): { raw: string; pack: VocabularyPack } {
  const raw = readFileSync(resolve(process.cwd(), 'public', book.path.replace(/^\//, '')), 'utf8');
  assert.equal(createHash('sha256').update(raw).digest('hex'), book.sha256, `${book.path} hash mismatch`);
  return { raw, pack: JSON.parse(raw) as VocabularyPack };
}

test('vocabulary packs match the manifest', () => {
  let total = 0;
  for (const book of MANIFEST.books) {
    const { raw, pack } = loadPack(book);
    assert.equal(pack.bookId, book.bookId);
    assert.equal(pack.count, pack.items.length);
    assert.equal(Buffer.byteLength(raw), book.bytes);
    total += pack.items.length;
  }
  assert.equal(total, MANIFEST.totalCount);
});

test('vocabulary rows keep id, audio, and part-of-speech shape', () => {
  for (const book of MANIFEST.books) {
    const { pack } = loadPack(book);
    for (const row of pack.items) {
      assert.match(row.id, /^B\dL\d{2}-\d-\d{2}$/, `bad id ${row.id}`);
      assert.ok(!row.audio || row.audio === `modernchinese-${row.id}.mp3`, `${row.id} audio: ${row.audio}`);
      assert.ok(row.pos && row.pos.split('/').every((atom) => POS_ATOMS.has(atom)), `${row.id} pos: ${row.pos}`);
    }
  }
});

test('vocabulary pinyin uses tone-marked, well-formed readings', () => {
  for (const book of MANIFEST.books) {
    const { pack } = loadPack(book);
    for (const row of pack.items) {
      const pinyin = row.pinyin ?? '';
      if (HAN.test(row.traditional ?? '') || HAN.test(row.simplified ?? '')) {
        assert.ok(pinyin.trim(), `${row.id} has no pinyin`);
      }
      assert.ok(PINYIN_CHARSET.test(pinyin), `${row.id} pinyin charset: ${pinyin}`);
      if (pinyin && !NEUTRAL_TONE_WORDS.has(row.traditional ?? '') && /[a-zA-Z]/.test(pinyin)) {
        assert.ok(TONE_MARK.test(pinyin) || !/[aeiouü]/i.test(pinyin), `${row.id} pinyin has no tone mark: ${pinyin}`);
      }
    }
  }
});

test('vocabulary glosses use spaced measure-word pinyin and clean punctuation', () => {
  for (const book of MANIFEST.books) {
    const { pack } = loadPack(book);
    for (const row of pack.items) {
      const meaning = row.meaning ?? '';
      assert.ok(!/ {2,}/.test(meaning), `${row.id} double space`);
      assert.ok(!/(?<!\.)\.$/.test(meaning.trim()), `${row.id} trailing period`);
      for (const segment of meaning.match(/M:\s*[^)]*/g) ?? []) {
        assert.match(segment.trim(), MEASURE_WORD_SEGMENT, `${row.id} measure words: ${segment}`);
      }
    }
  }
});

test('vocabulary examples are clean text or JSON arrays, never <br> joined', () => {
  for (const book of MANIFEST.books) {
    const { pack } = loadPack(book);
    for (const row of pack.items) {
      const examples = row.examples ?? '';
      assert.ok(!examples.includes('<br'), `${row.id} still uses <br>`);
      if (!examples.trim()) continue;
      if (examples.trim().startsWith('[')) {
        const parsed = JSON.parse(examples) as Array<{ chinese?: unknown }>;
        assert.ok(Array.isArray(parsed) && parsed.length > 0, `${row.id} empty JSON examples`);
        for (const item of parsed) assert.equal(typeof item.chinese, 'string', `${row.id} example without chinese`);
      } else {
        assert.match(examples.trim(), /[。！？…][」』）)]*$/, `${row.id} example punctuation: ${examples.slice(0, 60)}`);
      }
    }
  }
});
