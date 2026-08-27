/**
 * Download the official 時代華語 Book 1 audio and re-encode it for app hosting.
 *
 * Source: the publisher's public Google Drive folders (indexed in
 * docs/audio_index_book1.json — see docs/OFFICIAL_AUDIO_SOURCES.md).
 * Output: output/official-audio/book1/<B1-LL-P-T.mp3>, re-encoded to 96 kbps
 * mono MP3 (the originals are ~320 kbps stereo speech; 96 kbps mono is
 * indistinguishable for Mandarin dialogue and ~70% smaller), plus a manifest
 * with hashes/sizes/durations at docs/audio_manifest_book1.json.
 *
 * Usage: node scripts/downloadOfficialAudio.mjs
 * Requires: ffmpeg + ffprobe on PATH.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const INDEX_PATH = 'docs/audio_index_book1.json';
const OUT_DIR = 'output/official-audio/book1';
const MANIFEST_PATH = 'docs/audio_manifest_book1.json';
const CONCURRENCY = 4;
const MAX_RETRIES = 2;
const MIN_DURATION_SEC = 3;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function downloadFile(fileId, dest) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
        { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await writeFile(dest, new Uint8Array(await response.arrayBuffer()));
      return;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
}

async function reencode(src, dest) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', src,
    '-ac', '1', '-b:a', '96k',
    '-map_metadata', '-1',
    dest,
  ], { stdio: 'ignore' });
}

/**
 * Find the end of the intro on 對話一 (dialogue 1) tracks: every such track
 * opens with ~11s of continuous jingle/announcement before the first long
 * silence, then the dialogue proper. Returns the trim point in seconds
 * (intro end + a short natural pause), or null when no intro is detected.
 */
async function detectIntroTrimSec(file) {
  const { stderr } = await execFileAsync('ffmpeg', [
    '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.8', '-f', 'null', '-',
  ], { maxBuffer: 4 * 1024 * 1024 });
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
  for (let i = 0; i < starts.length; i += 1) {
    // Ignore the short lead-in; look for the first long gap after ~2s.
    if (starts[i] < 2) continue;
    const end = ends[i] ?? starts[i] + 0.8;
    if (end - starts[i] >= 0.8) {
      return starts[i] + 0.8; // keep ~0.8s of pause before the dialogue
    }
  }
  return null;
}

/** Re-encode `src` into `dest`, cutting everything before `trimSec`. */
async function reencodeTrimmed(src, dest, trimSec) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', src,
    '-ss', String(trimSec),
    '-ac', '1', '-b:a', '96k',
    '-map_metadata', '-1',
    dest,
  ], { stdio: 'ignore' });
}

async function probeDuration(file) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ], { maxBuffer: 1024 * 1024 });
  return Number.parseFloat(stdout.trim());
}

async function sha256(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

const index = JSON.parse(await readFile(INDEX_PATH, 'utf8'));
const lessons = index.textbook_dialogue_audio.lessons;
const tracks = Object.entries(lessons)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, lesson]) => lesson.tracks);

await mkdir(OUT_DIR, { recursive: true });
// mkdir({recursive:true}) resolves to undefined when the directory already
// exists, so compute the path first and only use mkdir for its side effect.
const tmpDir = path.join(tmpdir(), 'rongwaps-official-audio');
await mkdir(tmpDir, { recursive: true });

let cursor = 0;
const results = [];
const failures = [];

async function worker() {
  while (cursor < tracks.length) {
    const track = tracks[cursor];
    cursor += 1;
    const { file } = track;
    const dest = path.join(OUT_DIR, file);
    const tmp = path.join(tmpDir, file);
    try {
      await downloadFile(track.id, tmp);
      await reencode(tmp, dest);
      // 對話一 tracks carry a ~11s jingle intro before the dialogue; trim it
      // so Listen starts at the dialogue. All other tracks pass through.
      const isDialogueOne = /^B1-\d{2}-1-1\.mp3$/.test(file);
      let trimmedIntroSec = null;
      if (isDialogueOne) {
        trimmedIntroSec = await detectIntroTrimSec(dest);
        if (trimmedIntroSec !== null && trimmedIntroSec > 0) {
          await reencodeTrimmed(tmp, dest, trimmedIntroSec);
        } else {
          trimmedIntroSec = null; // detection failed — keep the track intact
        }
      }
      const duration = await probeDuration(dest);
      if (!Number.isFinite(duration) || duration < MIN_DURATION_SEC) {
        throw new Error(`suspicious duration ${duration}s`);
      }
      const { size } = await stat(dest);
      results.push({
        file,
        bytes: size,
        sha256: await sha256(dest),
        durationSec: Number(duration.toFixed(2)),
        trimmedIntroSec,
      });
      console.log(`ok  ${file}  ${size} bytes  ${duration.toFixed(1)}s${trimmedIntroSec !== null ? `  (intro trimmed at ${trimmedIntroSec.toFixed(1)}s)` : ''}`);
    } catch (error) {
      failures.push({ file, error: String(error) });
      console.error(`FAIL ${file}: ${error}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

results.sort((a, b) => a.file.localeCompare(b.file));

const manifest = {
  bookId: 1,
  source: 'official 時代華語 Book 1 cloud audio (淡江大學華語中心)',
  encoding: { codec: 'mp3', bitrateKbps: 96, channels: 1 },
  count: results.length,
  files: results,
};

await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n${results.length} tracks encoded -> ${OUT_DIR}`);
console.log(`manifest -> ${MANIFEST_PATH}`);
if (failures.length > 0) {
  console.error(`${failures.length} failures:`);
  for (const failure of failures) console.error(`  ${failure.file}: ${failure.error}`);
  process.exitCode = 1;
}
