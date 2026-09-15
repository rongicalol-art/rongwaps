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
  const artifactFlagIndex = process.argv.indexOf('--artifact');
  const artifactName = artifactFlagIndex > -1 ? process.argv[artifactFlagIndex + 1] : 'book-1-hooks-v3.json';
  const artifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, artifactName), 'utf8')) as {
    records: HookRecord[];
  };

  const charItems = artifact.records
    .filter((record) => record.acceptance === 'clean' && record.hook)
    .map((record) => ({
      id: record.character,
      character: record.character,
      mnemonic: normalizeHook(record.hook!),
      content_type: 'character',
    }));
  const charHookByCharacter = new Map(charItems.map((item) => [item.character, item.mnemonic]));

  const wordsPath = resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json');
  const wordArtifact = existsSync(wordsPath)
    ? (JSON.parse(readFileSync(wordsPath, 'utf8')) as { records: WordHookRecord[] })
    : { records: [] as WordHookRecord[] };
  const wordItems = wordArtifact.records
    .filter((record) => record.acceptance === 'clean' && record.hook)
    .map((record) => ({
      id: `word_${record.word}`,
      character: record.word,
      mnemonic: normalizeHook(record.hook!),
      content_type: 'word',
    }));

  const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8')) as {
    entries: InventoryEntry[];
  };
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
      mnemonic: normalizeHook(charHookByCharacter.get(word)!),
      content_type: 'word',
    }));

  const items = [...charItems, ...mappedItems, ...wordItems];
  const skipped = artifact.records
    .filter((record) => record.acceptance !== 'clean' || !record.hook)
    .map((record) => `${record.character} (${record.acceptance})`);

  const pack = {
    schemaVersion: 1,
    bookId: 1,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  const packJson = `${JSON.stringify(pack)}\n`;
  const packJsonPretty = `${JSON.stringify(pack, null, 2)}\n`;
  const sha256 = createHash('sha256').update(packJson).digest('hex');

  const manifest = {
    schemaVersion: 1,
    version: sha256,
    generatedAt: pack.generatedAt,
    totalCount: items.length,
    books: [{
      bookId: 1,
      count: items.length,
      path: '/data/memory-hooks/book-1.json',
      sha256,
      bytes: Buffer.byteLength(packJson),
    }],
  };

  mkdirSync(PACK_DIR, { recursive: true });
  writeFileSync(resolve(PACK_DIR, 'book-1.json'), packJsonPretty);
  writeFileSync(resolve(PACK_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(JSON.stringify({
    items: items.length,
    skipped,
    version: sha256.slice(0, 12),
    bytes: Buffer.byteLength(packJson),
    packPath: resolve(PACK_DIR, 'book-1.json'),
    manifestPath: resolve(PACK_DIR, 'manifest.json'),
  }, null, 2));
}

main();
