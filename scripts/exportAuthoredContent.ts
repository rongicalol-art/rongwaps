import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { InteractiveGrammarPart, ReadingRecord } from '../src/types/models';

const ROOT = process.cwd();
const READINGS_DIR = resolve(ROOT, 'public/data/readings');
const GRAMMAR_DIR = resolve(ROOT, 'public/data/grammar');
const DIALOGUE_ALIGNMENT_DIR = resolve(ROOT, 'public/data/dialogue-alignment');
const SOURCE_ALIGNMENT_PATH = resolve(ROOT, 'content/dialogueAlignment.json');

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function exportPack<T>(
  dir: string,
  kind: string,
  bookId: number,
  items: T[],
) {
  await mkdir(dir, { recursive: true });
  const pack = {
    schemaVersion: 1,
    bookId,
    count: items.length,
    items,
  };
  const packJson = `${JSON.stringify(pack, null, 2)}\n`;
  const filename = `book-${bookId}.json`;
  const packHash = sha256(packJson);
  const packBytes = Buffer.byteLength(packJson);

  await writeFile(resolve(dir, filename), packJson, 'utf8');

  const manifest = {
    schemaVersion: 1,
    version: packHash.slice(0, 16),
    generatedAt: new Date().toISOString(),
    totalCount: items.length,
    books: [
      {
        bookId,
        count: items.length,
        path: `/data/${kind}/${filename}`,
        sha256: packHash,
        bytes: packBytes,
      },
    ],
  };

  await writeFile(resolve(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Exported ${kind} pack for Book ${bookId} (${items.length} items, ${packBytes} bytes).`);
}

async function exportDialogueAlignment(bookId: number) {
  await mkdir(DIALOGUE_ALIGNMENT_DIR, { recursive: true });
  const raw = await readFile(SOURCE_ALIGNMENT_PATH, 'utf8');
  const alignmentMap = JSON.parse(raw) as Record<string, unknown>;
  const keys = Object.keys(alignmentMap);

  const pack = {
    schemaVersion: 1,
    bookId,
    count: keys.length,
    items: alignmentMap,
  };
  const packJson = `${JSON.stringify(pack, null, 2)}\n`;
  const filename = `book-${bookId}.json`;
  const packHash = sha256(packJson);
  const packBytes = Buffer.byteLength(packJson);

  await writeFile(resolve(DIALOGUE_ALIGNMENT_DIR, filename), packJson, 'utf8');

  const manifest = {
    schemaVersion: 1,
    version: packHash.slice(0, 16),
    generatedAt: new Date().toISOString(),
    totalCount: keys.length,
    books: [
      {
        bookId,
        count: keys.length,
        path: `/data/dialogue-alignment/${filename}`,
        sha256: packHash,
        bytes: packBytes,
      },
    ],
  };

  await writeFile(resolve(DIALOGUE_ALIGNMENT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Exported dialogue-alignment pack for Book ${bookId} (${keys.length} items, ${packBytes} bytes).`);
}

async function loadSourceGrammarParts(bookId: number): Promise<InteractiveGrammarPart[]> {
  const grammarDir = resolve(ROOT, 'content/grammar');
  const fileNames = await readdir(grammarDir);
  const parts: InteractiveGrammarPart[] = [];
  for (const file of fileNames) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(await readFile(resolve(grammarDir, file), 'utf8')) as Record<string, unknown>;
    for (const key of Object.keys(content)) {
      if (key.includes('_PART_')) {
        const part = content[key] as InteractiveGrammarPart;
        if (part.bookId === bookId) {
          parts.push(part);
        }
      }
    }
  }
  parts.sort((a, b) => (a.lessonId - b.lessonId) || (a.partId - b.partId));
  return parts;
}

async function loadSourceReadings(bookId: number): Promise<ReadingRecord[]> {
  const readingsPath = resolve(ROOT, `content/readings/book-${bookId}.json`);
  return JSON.parse(await readFile(readingsPath, 'utf8')) as ReadingRecord[];
}

async function main() {
  console.log('Exporting authored content to public/data packs...');
  const readings = await loadSourceReadings(1);
  const grammarParts = await loadSourceGrammarParts(1);

  await exportPack(READINGS_DIR, 'readings', 1, readings);
  await exportPack(GRAMMAR_DIR, 'grammar', 1, grammarParts);
  await exportDialogueAlignment(1);
  console.log('All authored content packs exported successfully.');
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exitCode = 1;
});
