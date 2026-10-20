/**
 * applyBook1Examples.ts
 *
 * Merges authored example sentences with pinyin and English from
 * `content/vocabulary/book-1-examples.json` into `public/data/vocabulary/book-1.json`,
 * updates `public/data/vocabulary/manifest.json`, and re-exports flashcard extras.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const EXAMPLES_PATH = resolve(ROOT, 'content/vocabulary/book-1-examples.json');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const BOOK_1_PATH = resolve(VOCAB_DIR, 'book-1.json');
const MANIFEST_PATH = resolve(VOCAB_DIR, 'manifest.json');

interface ExampleEntry {
  chinese: string;
  pinyin: string;
  english: string;
}

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

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function main() {
  const examplesMap = JSON.parse(readFileSync(EXAMPLES_PATH, 'utf8')) as Record<string, ExampleEntry>;
  const pack = JSON.parse(readFileSync(BOOK_1_PATH, 'utf8')) as VocabPack;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as VocabManifest;

  let updatedCount = 0;
  for (const item of pack.items) {
    const entry = examplesMap[item.id];
    if (entry && entry.chinese) {
      item.examples = JSON.stringify([
        {
          chinese: entry.chinese,
          pinyin: entry.pinyin || '',
          english: entry.english || '',
        },
      ]);
      updatedCount++;
    }
  }

  const updatedJson = JSON.stringify(pack);
  writeFileSync(BOOK_1_PATH, updatedJson);

  const bookMeta = manifest.books.find((b) => b.bookId === 1);
  if (bookMeta) {
    bookMeta.sha256 = sha256(updatedJson);
    bookMeta.bytes = Buffer.byteLength(updatedJson);
  }

  manifest.version = sha256(manifest.books.map((b) => b.sha256).join('')).slice(0, 16);
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Applied ${updatedCount} structured example sentences to Book 1 vocabulary.`);
  console.log(`Updated ${BOOK_1_PATH} and ${MANIFEST_PATH}`);
}

main();
