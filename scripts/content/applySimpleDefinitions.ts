/**
 * applySimpleDefinitions.ts
 *
 * Merges authored simple definitions from `content/vocabulary/simpleDefinitions.json`
 * into `public/data/vocabulary/book-*.json` and updates `manifest.json`.
 * Leaves original `meaning` fields completely intact.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const SIMPLE_DEFS_PATH = resolve(ROOT, 'content/vocabulary/simpleDefinitions.json');

interface VocabItem {
  id: string;
  traditional?: string;
  simplified?: string;
  meaning?: string;
  simple?: string;
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

const simpleDefs = JSON.parse(readFileSync(SIMPLE_DEFS_PATH, 'utf8')) as Record<string, string>;
const updatedBooks: VocabManifest['books'] = [];

let appliedCount = 0;
let unchangedCount = 0;

for (let b = 1; b <= 4; b++) {
  const filePath = resolve(VOCAB_DIR, `book-${b}.json`);
  const rawBefore = readFileSync(filePath, 'utf8');
  const pack = JSON.parse(rawBefore) as VocabPack;

  for (const item of pack.items) {
    const simple = simpleDefs[item.id];
    if (simple) {
      item.simple = simple;
      appliedCount++;
    } else {
      unchangedCount++;
    }
  }

  const rawAfter = `${JSON.stringify(pack)}\n`;
  writeFileSync(filePath, rawAfter);

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

console.log('Applied simple definitions:');
console.log(`- Definitions mapped: ${appliedCount}`);
console.log(`- Definitions skipped: ${unchangedCount}`);
console.log(`- Manifest updated with new SHA256 hashes`);
