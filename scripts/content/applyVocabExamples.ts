/**
 * applyVocabExamples.ts
 *
 * Merges authored example sentences with tone-marked Pinyin and English from
 * `content/vocabulary/book-*-examples.json` into `public/data/vocabulary/book-*.json`,
 * updates `public/data/vocabulary/manifest.json`; run flashcard-extras:export after this.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadVocabularyExampleAudio, vocabularyExampleKey } from '../audio/vocabularyExampleAudio';

const ROOT = resolve(import.meta.dirname, '../..');
const CONTENT_VOCAB_DIR = resolve(ROOT, 'content/vocabulary');
const PUBLIC_VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const MANIFEST_PATH = resolve(PUBLIC_VOCAB_DIR, 'manifest.json');

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
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as VocabManifest;
  const audioBySentence = loadVocabularyExampleAudio();
  let totalUpdatedAcrossBooks = 0;

  for (let b = 1; b <= 4; b++) {
    const examplesPath = resolve(CONTENT_VOCAB_DIR, `book-${b}-examples.json`);
    const bookPath = resolve(PUBLIC_VOCAB_DIR, `book-${b}.json`);

    if (!existsSync(examplesPath) || !existsSync(bookPath)) continue;

    const examplesMap = JSON.parse(readFileSync(examplesPath, 'utf8')) as Record<string, ExampleEntry>;
    const pack = JSON.parse(readFileSync(bookPath, 'utf8')) as VocabPack;

    let updatedCount = 0;
    let audioCount = 0;
    for (const item of pack.items) {
      const entry = examplesMap[item.id];
      if (entry && entry.chinese) {
        const audio = audioBySentence.get(vocabularyExampleKey(item.id, entry.chinese));
        if (audio) audioCount++;
        item.examples = JSON.stringify([
          {
            chinese: entry.chinese,
            pinyin: entry.pinyin || '',
            english: entry.english || '',
            ...(audio ? { audio } : {}),
          },
        ]);
        updatedCount++;
      }
    }

    const updatedJson = JSON.stringify(pack);
    writeFileSync(bookPath, updatedJson);

    const bookMeta = manifest.books.find((book) => book.bookId === b);
    if (bookMeta) {
      bookMeta.sha256 = sha256(updatedJson);
      bookMeta.bytes = Buffer.byteLength(updatedJson);
    }

    console.log(`Book ${b}: applied ${updatedCount} example sentences; ${audioCount} with official recordings, ${updatedCount - audioCount} using speech fallback.`);
    totalUpdatedAcrossBooks += updatedCount;
  }

  manifest.version = sha256(manifest.books.map((b) => b.sha256).join('')).slice(0, 16);
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Total across books: ${totalUpdatedAcrossBooks} structured example sentences.`);
  console.log(`Updated manifest at ${MANIFEST_PATH}`);
}

main();
