/**
 * Re-encode the downloaded official Book 3 tracks (vocabulary + dialogue) to the same mono 96 kbps
 * mp3 Book 1 uses, ready for scripts/audio/uploadOfficialAudio.mjs --dir output/official-audio/book3-r2.
 * Writes content/audio/audio_manifest_book3.json (sha256 + duration of the hosted files).
 * Usage: node scripts/audio/reencodeBook3Audio.mjs
 * Requires: ffmpeg + ffprobe, and downloadBook3VocabularyTracks.mjs [--dialogue] run first.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SRC_DIR = 'output/official-audio/book3';
const OUT_DIR = 'output/official-audio/book3-r2';
const index = JSON.parse(await readFile('content/audio/audio_index_book3.json', 'utf8'));
const tracks = [...index.vocabularyTracks, ...index.dialogueTracks].sort((a, b) => a.file.localeCompare(b.file));

await mkdir(OUT_DIR, { recursive: true });
const files = [];
for (const track of tracks) {
  const dest = path.join(OUT_DIR, track.file);
  await execFileAsync('ffmpeg', ['-y', '-i', path.join(SRC_DIR, track.file), '-ac', '1', '-b:a', '96k', '-map_metadata', '-1', dest]);
  const { stdout } = await execFileAsync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest]);
  files.push({
    file: track.file,
    id: track.id,
    bytes: (await stat(dest)).size,
    sha256: createHash('sha256').update(await readFile(dest)).digest('hex'),
    durationSec: Number(Number.parseFloat(stdout.trim()).toFixed(3)),
  });
  console.log(`ok ${track.file}`);
}
await writeFile('content/audio/audio_manifest_book3.json', JSON.stringify({
  bookId: 3,
  source: 'Official TKU CLC Book 3 audio, re-encoded for Cloudflare R2',
  encoding: { codec: 'mp3', bitrateKbps: 96, channels: 1 },
  count: files.length,
  files,
}, null, 2) + '\n');
