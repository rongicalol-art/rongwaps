import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const PAGE_SIZE = 1000;
const SCHEMA_VERSION = 1;
const OUTPUT_DIRECTORY = resolve(process.cwd(), 'public/data/vocabulary');
const VOCABULARY_COLUMNS = 'id,traditional,simplified,meaning,pinyin,pos,audio,examples';

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

interface ManifestBook {
  bookId: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getBookId(id: string): number {
  const match = id.match(/^b(\d+)[-_]?l\d+/i);
  if (!match) throw new Error(`Cannot determine book from vocabulary id: ${id}`);
  return Number(match[1]);
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function fetchAllVocabulary(): Promise<VocabularyRow[]> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('VITE_SUPABASE_ANON_KEY'),
  );
  const rows: VocabularyRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('book_vocabulary')
      .select(VOCABULARY_COLUMNS)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Vocabulary export failed: ${error.message}`);

    const page = (data || []) as VocabularyRow[];
    rows.push(...page);
    console.log(`Fetched ${rows.length} vocabulary rows`);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function writePacks(rows: VocabularyRow[]): Promise<void> {
  const rowsByBook = new Map<number, VocabularyRow[]>();

  for (const row of rows) {
    const bookId = getBookId(row.id);
    const bookRows = rowsByBook.get(bookId) || [];
    bookRows.push(row);
    rowsByBook.set(bookId, bookRows);
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const books: ManifestBook[] = [];
  for (const [bookId, items] of [...rowsByBook.entries()].sort(([a], [b]) => a - b)) {
    const pack: VocabularyPack = {
      schemaVersion: SCHEMA_VERSION,
      bookId,
      count: items.length,
      items,
    };
    const content = `${JSON.stringify(pack)}\n`;
    const filename = `book-${bookId}.json`;

    await writeFile(resolve(OUTPUT_DIRECTORY, filename), content, 'utf8');
    books.push({
      bookId,
      count: items.length,
      path: `/data/vocabulary/${filename}`,
      sha256: hash(content),
      bytes: Buffer.byteLength(content),
    });
  }

  const contentVersion = hash(books.map((book) => book.sha256).join(':')).slice(0, 16);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    version: contentVersion,
    generatedAt: new Date().toISOString(),
    totalCount: rows.length,
    books,
  };

  await writeFile(
    resolve(OUTPUT_DIRECTORY, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function verifyPacks(sourceRows: VocabularyRow[]): Promise<void> {
  const manifestPath = resolve(OUTPUT_DIRECTORY, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    totalCount: number;
    books: ManifestBook[];
  };
  const exportedIds: string[] = [];

  for (const book of manifest.books) {
    const packPath = resolve(process.cwd(), 'public', book.path.replace(/^\//, ''));
    const content = await readFile(packPath, 'utf8');
    const pack = JSON.parse(content) as VocabularyPack;

    if (pack.bookId !== book.bookId || pack.count !== pack.items.length) {
      throw new Error(`Invalid metadata in vocabulary pack for book ${book.bookId}`);
    }
    if (hash(content) !== book.sha256) {
      throw new Error(`Hash mismatch in vocabulary pack for book ${book.bookId}`);
    }

    exportedIds.push(...pack.items.map((item) => item.id));
  }

  const sourceIds = sourceRows.map((row) => row.id).sort();
  exportedIds.sort();

  if (manifest.totalCount !== sourceIds.length || exportedIds.length !== sourceIds.length) {
    throw new Error(`Count mismatch: source=${sourceIds.length}, exported=${exportedIds.length}`);
  }
  if (new Set(exportedIds).size !== exportedIds.length) {
    throw new Error('Duplicate vocabulary IDs found in exported packs');
  }
  if (sourceIds.some((id, index) => id !== exportedIds[index])) {
    throw new Error('Exported vocabulary IDs do not exactly match Supabase');
  }

  console.log(`Verified ${exportedIds.length} vocabulary rows across ${manifest.books.length} books`);
}

async function main(): Promise<void> {
  const rows = await fetchAllVocabulary();
  await writePacks(rows);
  await verifyPacks(rows);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
