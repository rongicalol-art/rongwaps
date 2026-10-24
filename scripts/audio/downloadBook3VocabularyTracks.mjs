/**
 * Download the official Book 3 vocabulary tracks (or, with --dialogue, the dialogue tracks) for
 * local alignment. These originals stay in ignored output/ and are never uploaded by this script.
 * Usage: node scripts/audio/downloadBook3VocabularyTracks.mjs [--dialogue]
 * Requires: ffprobe.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const INDEX_PATH = 'content/audio/audio_index_book3.json';
const OUT_DIR = 'output/official-audio/book3';
const DIALOGUE = process.argv.includes('--dialogue');
const KIND = DIALOGUE ? 'dialogue' : 'vocabulary';
const MANIFEST_PATH = path.join(OUT_DIR, `${KIND}-manifest.json`);
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const CONCURRENCY = 3;

const index = JSON.parse(await readFile(INDEX_PATH, 'utf8'));
const tracks = DIALOGUE ? index.dialogueTracks : index.vocabularyTracks;
if (!Array.isArray(tracks) || tracks.length !== 32) throw new Error(`Expected 32 indexed Book 3 ${KIND} tracks.`);

await mkdir(OUT_DIR, { recursive: true });
let cursor = 0;
const results = [];
const failures = [];

async function download(track) {
  const dest = path.join(OUT_DIR, track.file);
  const response = await fetch(index.streamUrlPattern.replace('{FILE_ID}', track.id), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(120_000),
    redirect: 'follow',
  });
  if (!response.ok || !/^audio\//i.test(response.headers.get('content-type') || '')) {
    throw new Error(`unexpected response ${response.status} ${response.headers.get('content-type') || ''}`.trim());
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length < 10_000) throw new Error(`suspiciously small audio (${body.length} bytes)`);
  await writeFile(dest, body);
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest,
  ], { maxBuffer: 1024 * 1024 });
  const durationSec = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(durationSec) || durationSec < 3) throw new Error(`suspicious duration ${durationSec}s`);
  return {
    ...track,
    bytes: (await stat(dest)).size,
    sha256: createHash('sha256').update(body).digest('hex'),
    durationSec: Number(durationSec.toFixed(2)),
  };
}

async function worker() {
  while (cursor < tracks.length) {
    const track = tracks[cursor++];
    try {
      const result = await download(track);
      results.push(result);
      console.log(`ok  ${result.file}  ${result.bytes} bytes  ${result.durationSec}s`);
    } catch (error) {
      failures.push({ file: track.file, error: String(error).slice(0, 240) });
      console.error(`FAIL ${track.file}: ${error}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
results.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(MANIFEST_PATH, JSON.stringify({
  bookId: 3,
  source: `Official TKU CLC Book 3 ${KIND} tracks; local alignment copies only`,
  encoding: 'original source files; not re-encoded or published',
  count: results.length,
  files: results,
}, null, 2) + '\n');
console.log(`\n${results.length}/${tracks.length} tracks downloaded -> ${OUT_DIR}`);
console.log(`local manifest -> ${MANIFEST_PATH}`);
if (failures.length) process.exitCode = 1;
