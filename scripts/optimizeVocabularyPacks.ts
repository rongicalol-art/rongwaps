/**
 * optimizeVocabularyPacks.ts
 *
 * Strips redundant deterministic audio filenames ("modernchinese-B*L*-*-*.mp3")
 * from all 4 course vocabulary books and updates manifest.json.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');

interface VocabItem {
  id: string;
  traditional?: string;
  simplified?: string;
  meaning?: string;
  pinyin?: string;
  pos?: string;
  audio?: string;
  examples?: unknown;
}

interface VocabPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: VocabItem[];
}

interface VocabManifest {
  schemaVersion: number;
  version: string;
  generatedAt: string;
  totalCount: number;
  books: Array<{
    bookId: number;
    count: number;
    path: string;
    sha256: string;
    bytes: number;
  }>;
}

let totalBefore = 0;
let totalAfter = 0;
let audioStrippedCount = 0;
let noAudioCount = 0;

const updatedBooks: VocabManifest['books'] = [];

for (let b = 1; b <= 4; b++) {
  const filePath = resolve(VOCAB_DIR, `book-${b}.json`);
  const rawBefore = readFileSync(filePath, 'utf8');
  totalBefore += Buffer.byteLength(rawBefore);

  const pack = JSON.parse(rawBefore) as VocabPack;

  for (const item of pack.items) {
    const deterministicAudio = `modernchinese-${item.id}.mp3`;
    if (item.audio === deterministicAudio) {
      delete item.audio;
      audioStrippedCount++;
    } else if (!item.audio) {
      item.audio = '';
      noAudioCount++;
    }
  }

  const rawAfter = `${JSON.stringify(pack)}\n`;
  writeFileSync(filePath, rawAfter);
  totalAfter += Buffer.byteLength(rawAfter);

  const sha256 = createHash('sha256').update(rawAfter).digest('hex');
  const bytes = Buffer.byteLength(rawAfter);

  updatedBooks.push({
    bookId: b,
    count: pack.items.length,
    path: `/data/vocabulary/book-${b}.json`,
    sha256,
    bytes,
  });
}

const manifestPath = resolve(VOCAB_DIR, 'manifest.json');
const manifest: VocabManifest = {
  schemaVersion: 1,
  version: updatedBooks[0].sha256.slice(0, 16),
  generatedAt: new Date().toISOString(),
  totalCount: updatedBooks.reduce((sum, b) => sum + b.count, 0),
  books: updatedBooks,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Optimized Vocabulary Packs:`);
console.log(`- Redundant audio fields stripped: ${audioStrippedCount}`);
console.log(`- Items with explicitly empty audio preserved: ${noAudioCount}`);
console.log(`- Size before: ${(totalBefore / 1024).toFixed(1)} KB`);
console.log(`- Size after:  ${(totalAfter / 1024).toFixed(1)} KB`);
console.log(`- Savings:     ${((totalBefore - totalAfter) / 1024).toFixed(1)} KB (${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}% cut)`);
