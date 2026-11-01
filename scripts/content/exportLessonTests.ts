/**
 * Export the authored lesson tests (content/lesson-tests/book-N/lessonNN.json) to the `lesson-tests` pack
 * (public/data/lesson-tests/book-N.json + manifest.json), attaching the published studio recording to every
 * spoken line, question and answer from content/audio/lesson_test_audio.json.
 *
 *   npm run lesson-tests:export
 *
 * The receipt names which voice speaks each role (F, M, N); a spoken line without a recording is reported,
 * and `--strict` (used by the content tests' expectations) makes it an error.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LessonTestLesson, LessonTestPack, LessonTestSounds } from '../../src/types/lessonTest';
import type { SentenceAudio } from '../../src/types/grammarPractice';

const ROOT = process.cwd();
const CONTENT = resolve(ROOT, 'content/lesson-tests');
const RECEIPT = resolve(ROOT, 'content/audio/lesson_test_audio.json');
const OUT = resolve(ROOT, 'public/data/lesson-tests');

export interface LessonTestAudioReceipt {
  voices: Record<'F' | 'M' | 'N', string>;
  clips: Record<string, { file: string; sha256: string; duration: number }>;
  sounds: { ding?: { file: string }; letters?: Record<string, { file: string }> };
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const studio = (file: string): SentenceAudio => ({ voice: 'studio', file });

/** Attach recordings in place; returns the spoken texts that have none. */
function attachAudio(node: unknown, receipt: LessonTestAudioReceipt | null, missing: string[]): void {
  if (Array.isArray(node)) { node.forEach((entry) => attachAudio(entry, receipt, missing)); return; }
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  const speaker = record.speaker as 'F' | 'M' | 'N' | undefined;
  if (speaker && typeof record.traditional === 'string') {
    const clip = receipt?.clips[`${receipt.voices[speaker]}|${record.traditional}`];
    if (clip) record.audio = studio(clip.file);
    else missing.push(`${speaker}: ${record.traditional}`);
  }
  for (const value of Object.values(record)) attachAudio(value, receipt, missing);
}

async function main() {
  const strict = process.argv.includes('--strict');
  const receipt = existsSync(RECEIPT) ? JSON.parse(await readFile(RECEIPT, 'utf8')) as LessonTestAudioReceipt : null;
  const sounds: LessonTestSounds = {};
  if (receipt?.sounds.ding) sounds.ding = studio(receipt.sounds.ding.file);
  if (receipt?.sounds.letters) {
    sounds.letters = Object.fromEntries(Object.entries(receipt.sounds.letters).map(([letter, clip]) => [letter, studio(clip.file)]));
  }

  const books = (await readdir(CONTENT)).filter((name) => /^book-\d+$/.test(name)).sort();
  await mkdir(OUT, { recursive: true });
  const manifestBooks: Array<{ bookId: number; count: number; path: string; sha256: string; bytes: number }> = [];
  const missing: string[] = [];
  for (const folder of books) {
    const bookId = Number(folder.slice(5));
    const files = (await readdir(resolve(CONTENT, folder))).filter((name) => /^lesson\d+\.json$/.test(name)).sort();
    const lessons: LessonTestLesson[] = [];
    for (const file of files) {
      const lesson = JSON.parse(await readFile(resolve(CONTENT, folder, file), 'utf8')) as LessonTestLesson;
      if (lesson.bookId !== bookId) throw new Error(`${folder}/${file}: bookId ${lesson.bookId} is not ${bookId}`);
      attachAudio(lesson.slots, receipt, missing);
      lessons.push(lesson);
    }
    lessons.sort((a, b) => a.lessonId - b.lessonId);
    const pack: LessonTestPack = { schemaVersion: 1, bookId, count: lessons.length, sounds, items: lessons };
    const json = `${JSON.stringify(pack)}\n`;
    const path = `book-${bookId}.json`;
    await writeFile(resolve(OUT, path), json, 'utf8');
    manifestBooks.push({ bookId, count: lessons.length, path: `/data/lesson-tests/${path}`, sha256: sha256(json), bytes: Buffer.byteLength(json) });
    console.log(`Exported lesson tests for Book ${bookId} (${lessons.length} lessons, ${Buffer.byteLength(json)} bytes).`);
  }
  const manifest = {
    schemaVersion: 1,
    version: sha256(manifestBooks.map((book) => book.sha256).join('')).slice(0, 16),
    totalCount: manifestBooks.reduce((sum, book) => sum + book.count, 0),
    books: manifestBooks,
  };
  await writeFile(resolve(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (missing.length) {
    console.warn(`${missing.length} spoken line(s) have no recording yet:\n  ${[...new Set(missing)].join('\n  ')}`);
    if (strict) process.exit(1);
  }
}

void main().catch((error) => { console.error(error); process.exit(1); });
