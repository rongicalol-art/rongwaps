/**
 * Download the provided official Book 2 tracks for local alignment only.
 * Originals and a verification manifest stay under ignored output/.
 * Usage: node scripts/audio/downloadBook2Tracks.mjs
 * Requires: ffprobe.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const INDEX_PATH = 'content/audio/audio_index_book2.json';
const OUT_DIR = 'output/official-audio/book2/originals';
const MANIFEST_PATH = 'output/official-audio/book2/manifest.json';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const index = JSON.parse(await readFile(INDEX_PATH, 'utf8'));
const tracks = [...index.dialogueTracks, ...index.readingTracks];
if (index.book !== 2 || index.dialogueTracks.length !== 8 || index.readingTracks.length !== 8) {
  throw new Error('Expected 8 dialogue and 8 reading tracks for Book 2.');
}

await mkdir(OUT_DIR, { recursive: true });
const results = [];
const failures = [];
for (const track of tracks) {
  const dest = path.join(OUT_DIR, track.file);
  try {
    let body;
    try {
      body = await readFile(dest);
    } catch {
      const response = await fetch(index.streamUrlPattern.replace('{FILE_ID}', track.id), {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
      });
      const contentType = response.headers.get('content-type') || '';
      const dispositionName = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1];
      if (!response.ok || !/^audio\/mpeg/i.test(contentType) || dispositionName !== track.file) {
        throw new Error(`unexpected response ${response.status} ${contentType} ${dispositionName || 'no filename'}`);
      }
      body = Buffer.from(await response.arrayBuffer());
      if (body.length < 10_000) throw new Error(`suspicious audio payload (${body.length} bytes)`);
      await writeFile(dest, body);
    }
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest,
    ], { maxBuffer: 1024 * 1024 });
    const durationSec = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(durationSec) || durationSec < 3) throw new Error(`suspicious duration ${durationSec}s`);
    results.push({ ...track, bytes: (await stat(dest)).size,
      sha256: createHash('sha256').update(body).digest('hex'), durationSec: Number(durationSec.toFixed(2)) });
    console.log(`ok ${track.file} ${body.length} bytes ${durationSec.toFixed(1)}s`);
  } catch (error) {
    failures.push({ file: track.file, error: String(error).slice(0, 240) });
    console.error(`FAIL ${track.file}: ${error}`);
  }
}
await writeFile(MANIFEST_PATH, JSON.stringify({ bookId: 2, source: index.source,
  encoding: 'original publisher MP3s; local alignment copies only', count: results.length,
  files: results, failures }, null, 2) + '\n');
console.log(`\n${results.length}/${tracks.length} original tracks downloaded -> ${OUT_DIR}`);
console.log(`local manifest -> ${MANIFEST_PATH}`);
if (failures.length) process.exitCode = 1;
