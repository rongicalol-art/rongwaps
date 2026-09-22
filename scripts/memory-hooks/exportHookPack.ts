import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PACK_DIR = resolve(ROOT, 'public/data/memory-hooks');

interface HookRecord {
  character: string;
  meaning: string | null;
  hook: string | null;
  acceptance: string;
}

interface WordHookRecord {
  word: string;
  hook: string | null;
  acceptance: string;
}

interface InventoryEntry {
  character: string;
  occurrences: Array<{ word: string }>;
}

interface PackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: 'character' | 'word';
}

interface ManifestBook {
  bookId: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

/** Mirrors `cleanVocabText` in src/utils/vocabCleaner.ts. */
function cleanVocabText(text: string): string {
  let cleaned = text.trim().replace(/\(.*?\)/g, '').replace(/[（）]/g, '');
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) cleaned = cleaned.substring(0, slashIndex);
  return cleaned.trim();
}

function normalizeHook(hook: string): string {
  return hook
    .replace(/(\p{Script=Han})\s+\(/gu, '$1(')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function main(): void {
  const bookId = Number(argumentValue('--book', '1'));
  const stem = `book-${bookId}`;
  const artifactName = argumentValue('--artifact', `${stem}-hooks-v3.json`);
  const idsFlagIndex = process.argv.indexOf('--ids');
  const allowedIds = idsFlagIndex > -1
    ? new Set((JSON.parse(readFileSync(resolve(process.argv[idsFlagIndex + 1]), 'utf8')) as { ids: string[] }).ids)
    : null;

  const artifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, artifactName), 'utf8')) as {
    records: HookRecord[];
  };

  const charItems = artifact.records
    .filter((record) => record.acceptance === 'clean' && record.hook)
    .map((record) => ({
      id: record.character,
      character: record.character,
      mnemonic: normalizeHook(record.hook!),
      content_type: 'character' as const,
    }))
    .filter((item) => !allowedIds || allowedIds.has(item.id));
  const charHookByCharacter = new Map(charItems.map((item) => [item.character, item.mnemonic]));

  const wordsPath = resolve(OUTPUT_DIR, `${stem}-word-hooks-v1.json`);
  const wordArtifact = existsSync(wordsPath)
    ? (JSON.parse(readFileSync(wordsPath, 'utf8')) as { records: WordHookRecord[] })
    : { records: [] as WordHookRecord[] };
  const wordItems = wordArtifact.records
    .filter((record) => record.acceptance === 'clean' && record.hook)
    .map((record) => ({
      id: `word_${record.word}`,
      character: record.word,
      mnemonic: normalizeHook(record.hook!),
      content_type: 'word' as const,
    }))
    .filter((item) => !allowedIds || allowedIds.has(item.id));

  const inventory = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, `${stem}-inventory.json`), 'utf8'),
  ) as { entries: InventoryEntry[] };
  const singleCharWords = new Set<string>();
  for (const entry of inventory.entries) {
    for (const occurrence of entry.occurrences) {
      const word = cleanVocabText(occurrence.word);
      if ([...word].length === 1) singleCharWords.add(word);
    }
  }
  const mappedItems = [...singleCharWords]
    .filter((word) => charHookByCharacter.has(word))
    .map((word) => ({
      id: `word_${word}`,
      character: word,
      mnemonic: charHookByCharacter.get(word)!,
      content_type: 'word' as const,
    }))
    .filter((item) => !allowedIds || allowedIds.has(item.id));

  const byId = new Map<string, PackItem>();
  for (const item of [...charItems, ...mappedItems, ...wordItems]) byId.set(item.id, item);
  const items = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id, 'zh-Hant'));

  const pack = {
    schemaVersion: 1,
    bookId,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  const packJson = `${JSON.stringify(pack)}\n`;
  const packJsonPretty = `${JSON.stringify(pack, null, 2)}\n`;
  const sha256 = createHash('sha256').update(packJson).digest('hex');

  const packPath = resolve(PACK_DIR, `${stem}.json`);
  mkdirSync(PACK_DIR, { recursive: true });
  writeFileSync(packPath, packJsonPretty);

  const manifestPath = resolve(PACK_DIR, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        schemaVersion: number;
        version: string;
        generatedAt: string;
        totalCount: number;
        books: ManifestBook[];
      })
    : { schemaVersion: 1, version: '', generatedAt: '', totalCount: 0, books: [] };
  const bookEntry: ManifestBook = {
    bookId,
    count: items.length,
    path: `/data/memory-hooks/${stem}.json`,
    sha256,
    bytes: Buffer.byteLength(packJson),
  };
  const books = [...manifest.books.filter((book) => book.bookId !== bookId), bookEntry]
    .sort((left, right) => left.bookId - right.bookId);
  const manifestVersion = createHash('sha256')
    .update(JSON.stringify({ schemaVersion: 1, books: books.map((book) => ({ bookId: book.bookId, sha256: book.sha256 })) }))
    .digest('hex');
  const nextManifest = {
    schemaVersion: 1,
    version: manifestVersion,
    generatedAt: new Date().toISOString(),
    totalCount: books.reduce((total, book) => total + book.count, 0),
    books,
  };
  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

  const skipped = artifact.records
    .filter((record) => record.acceptance !== 'clean' || !record.hook)
    .map((record) => `${record.character} (${record.acceptance})`);
  console.log(JSON.stringify({
    bookId,
    items: items.length,
    characters: charItems.length,
    words: wordItems.length,
    singleCharMirrors: mappedItems.length,
    skipped: skipped.length,
    version: sha256.slice(0, 12),
    manifestVersion: manifestVersion.slice(0, 12),
    packPath,
  }, null, 2));
}

main();
