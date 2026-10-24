import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getPatternRowGroups } from '../../src/utils/grammar/grammarPatternLayout';
import type { GrammarPatternRow, GrammarPractice, InteractiveGrammarPart, ReadingRecord, SentenceAudio } from '../../src/types/models';

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

  let manifestBooks = [
    {
      bookId,
      count: items.length,
      path: `/data/${kind}/${filename}`,
      sha256: packHash,
      bytes: packBytes,
    },
  ];

  try {
    const existing = JSON.parse(await readFile(resolve(dir, 'manifest.json'), 'utf8')) as { books?: { bookId: number; count: number; path: string; sha256: string; bytes: number }[] };
    if (existing?.books && Array.isArray(existing.books)) {
      manifestBooks = existing.books.filter((b) => b.bookId !== bookId);
      manifestBooks.push({
        bookId,
        count: items.length,
        path: `/data/${kind}/${filename}`,
        sha256: packHash,
        bytes: packBytes,
      });
      manifestBooks.sort((a, b) => a.bookId - b.bookId);
    }
  } catch {
    // Missing manifest is expected on clean build
  }

  const manifest = {
    schemaVersion: 1,
    version: packHash.slice(0, 16),
    generatedAt: new Date().toISOString(),
    totalCount: manifestBooks.reduce((sum, b) => sum + b.count, 0),
    books: manifestBooks,
  };

  await writeFile(resolve(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Exported ${kind} pack for Book ${bookId} (${items.length} items, ${packBytes} bytes).`);
}

async function exportDialogueAlignment(bookId: number) {
  await mkdir(DIALOGUE_ALIGNMENT_DIR, { recursive: true });
  const sourcePath = bookId === 1
    ? SOURCE_ALIGNMENT_PATH
    : resolve(ROOT, `content/dialogueAlignment-book${bookId}.json`);
  const raw = await readFile(sourcePath, 'utf8');
  const alignmentMap = JSON.parse(raw) as Record<string, unknown>;

  const filteredMap: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(alignmentMap)) {
    if (key.startsWith(`B${bookId}`) || (!key.startsWith('B') && bookId === 1)) {
      filteredMap[key] = val;
    }
  }
  const keys = Object.keys(filteredMap);

  const pack = {
    schemaVersion: 1,
    bookId,
    count: keys.length,
    items: filteredMap,
  };
  const packJson = `${JSON.stringify(pack, null, 2)}\n`;
  const filename = `book-${bookId}.json`;
  const packHash = sha256(packJson);
  const packBytes = Buffer.byteLength(packJson);

  await writeFile(resolve(DIALOGUE_ALIGNMENT_DIR, filename), packJson, 'utf8');

  let manifestBooks = [
    {
      bookId,
      count: keys.length,
      path: `/data/dialogue-alignment/${filename}`,
      sha256: packHash,
      bytes: packBytes,
    },
  ];

  try {
    const existing = JSON.parse(await readFile(resolve(DIALOGUE_ALIGNMENT_DIR, 'manifest.json'), 'utf8')) as { books?: { bookId: number; count: number; path: string; sha256: string; bytes: number }[] };
    if (existing?.books && Array.isArray(existing.books)) {
      manifestBooks = existing.books.filter((b) => b.bookId !== bookId);
      manifestBooks.push({
        bookId,
        count: keys.length,
        path: `/data/dialogue-alignment/${filename}`,
        sha256: packHash,
        bytes: packBytes,
      });
      manifestBooks.sort((a, b) => a.bookId - b.bookId);
    }
  } catch {
    // Missing manifest is expected on clean build
  }

  const manifest = {
    schemaVersion: 1,
    version: packHash.slice(0, 16),
    generatedAt: new Date().toISOString(),
    totalCount: manifestBooks.reduce((sum, b) => sum + b.count, 0),
    books: manifestBooks,
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
  await attachGrammarPractice(parts, bookId);
  await attachSentenceAudio(parts);
  return parts;
}

/**
 * Every grammar sentence (page text or exercise sentence: anything with `traditional` and `english`)
 * and every pattern-table row without an example under it uses the book's grammar track first (an
 * owner-approved near miss counts), then a dialogue clip, then an approved studio recording. Keys
 * are the sentence's Chinese characters.
 */
async function attachSentenceAudio(parts: InteractiveGrammarPart[]) {
  const read = async (file: string) => JSON.parse(await readFile(resolve(ROOT, file), 'utf8').catch(() => '{}')) as Record<string, Omit<SentenceAudio, 'voice'>>;
  const grammarTrack = await read('content/audio/grammar_track_clips.json');
  const approved = await read('content/audio/grammar_track_approved.json');
  const dialogue = await read('content/audio/grammar_book_clips.json');
  const studio = await read('content/audio/grammar_studio_audio.json');
  const han = (text: string) => [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('');
  const audioFor = (text: string): SentenceAudio | undefined => {
    const key = han(text);
    const clip = approved[key] ?? grammarTrack[key] ?? dialogue[key];
    if (clip) return { voice: 'book', file: clip.file, start: clip.start, end: clip.end };
    return studio[key] ? { voice: 'studio', file: studio[key].file } : undefined;
  };
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.traditional === 'string' && 'english' in record) {
      const audio = audioFor(record.traditional);
      if (audio) record.audio = audio;
    }
    if (Array.isArray(record.subject) && Array.isArray(record.grammar) && Array.isArray(record.complement) && !record.exampleId) {
      const row = record as unknown as GrammarPatternRow;
      const audio = audioFor(getPatternRowGroups(row).flat().map((token) => token.traditional).join(''));
      if (audio) record.audio = audio;
    }
    Object.values(record).forEach(walk);
  };
  walk(parts);
}

/** Book exercises live in content/grammar-practice/*.json keyed by grammar page id; they ride on their page in the grammar pack. */
async function attachGrammarPractice(parts: InteractiveGrammarPart[], bookId: number) {
  const practiceDir = resolve(ROOT, 'content/grammar-practice');
  const pages = new Map(parts.flatMap((part) => part.grammarPages.map((page) => [page.id, page] as const)));
  for (const file of (await readdir(practiceDir)).filter((name) => name.endsWith('.json'))) {
    const isB3File = file.startsWith('b3');
    if (bookId === 1 && isB3File) continue;
    if (bookId === 3 && !isB3File) continue;
    const content = JSON.parse(await readFile(resolve(practiceDir, file), 'utf8')) as Record<string, GrammarPractice>;
    for (const [pageId, practice] of Object.entries(content)) {
      const page = pages.get(pageId);
      if (!page) throw new Error(`${file}: no grammar page "${pageId}" in book ${bookId}.`);
      page.practice = practice;
    }
  }
}

async function loadSourceReadings(bookId: number): Promise<ReadingRecord[]> {
  const readingsPath = resolve(ROOT, `content/readings/book-${bookId}.json`);
  return JSON.parse(await readFile(readingsPath, 'utf8')) as ReadingRecord[];
}

interface AlignedLineSource { text: string; start: number; end: number; unmatched?: boolean }

/**
 * Reading lines without a hosted track (Book 1 plays its official track instead): the line's clip
 * of the book's own recording (forced-aligned, streamed from the official Drive file), else its
 * studio recording.
 */
async function attachReadingAudio(bookId: number, readings: ReadingRecord[]) {
  const studio = JSON.parse(await readFile(resolve(ROOT, 'content/audio/grammar_studio_audio.json'), 'utf8').catch(() => '{}')) as Record<string, { file: string }>;
  const index = JSON.parse(await readFile(resolve(ROOT, `content/audio/audio_index_book${bookId}.json`), 'utf8').catch(() => '{}')) as {
    streamUrlPattern?: string; dialogueTracks?: Array<{ file: string; id: string }>;
  };
  const alignment = JSON.parse(await readFile(resolve(ROOT, `content/dialogueAlignment-book${bookId}.json`), 'utf8').catch(() => '{}')) as Record<string, {
    audioFile: string; lines: AlignedLineSource[];
  }>;
  const trackIds = new Map((index.dialogueTracks ?? []).map((track) => [track.file, track.id]));
  const han = (text: string) => [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('');
  for (const reading of readings) {
    const aligned = alignment[reading.id];
    const trackId = aligned && trackIds.get(aligned.audioFile);
    reading.paragraphs.forEach((line, lineIndex) => {
      const range = aligned?.lines[lineIndex];
      if (trackId && index.streamUrlPattern && range && !range.unmatched && range.end > range.start && range.text === line.traditional) {
        line.audio = { voice: 'book', file: index.streamUrlPattern.replace('{FILE_ID}', trackId), start: range.start, end: range.end, cache: false };
        return;
      }
      const clip = studio[han(line.traditional)];
      if (clip) line.audio = { voice: 'studio', file: clip.file };
    });
  }
}

async function main() {
  console.log('Exporting authored content to public/data packs...');
  for (const bookId of [1, 3]) {
    const readings = await loadSourceReadings(bookId);
    if (bookId !== 1) await attachReadingAudio(bookId, readings);
    const grammarParts = await loadSourceGrammarParts(bookId);

    await exportPack(READINGS_DIR, 'readings', bookId, readings);
    await exportPack(GRAMMAR_DIR, 'grammar', bookId, grammarParts);
    await exportDialogueAlignment(bookId);
  }
  console.log('All authored content packs exported successfully.');
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exitCode = 1;
});
