/** Normalize Book 1 without changing originals or alignment offsets.
 * node --env-file=.env scripts/audio/normalizeBook1Audio.mjs [--upload]
 * Requires ffmpeg/ffprobe and the existing official/trimmed local source files.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const exec = promisify(execFile);
const root = 'output/audio/book1-loudness-v1';
const prefix = 'normalized/book1-v1/';
const targetLufs = -16.5;
const peakCeilingDbtp = -1.5;
const hash = (body) => createHash('sha256').update(body).digest('hex');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const official = await json('content/audio/audio_manifest_book1.json');
const trims = await json('content/audio/vocabulary_trim.json');
const sources = official.files.map((entry) => ({
  file: entry.file, local: `output/official-audio/book1/${entry.file}`, sha256: entry.sha256,
}));
for (const entry of trims.results.filter((entry) => entry.id.startsWith('B1'))) {
  sources.push({ file: entry.source, local: `output/audio/vocabulary-trim-v1/originals/${entry.source}`, sha256: entry.sourceSha256 });
  if (entry.status === 'trimmed') sources.push({ file: entry.audio,
    local: `output/audio/vocabulary-trim-v1/clips/${path.basename(entry.audio)}`, sha256: entry.sha256 });
}
if (new Set(sources.map((entry) => entry.file)).size !== sources.length) throw new Error('Duplicate source.');

async function measure(file) {
  const { stderr } = await exec('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { maxBuffer: 1024 * 1024 });
  const match = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error(`Missing loudness measurement: ${file}`);
  const result = JSON.parse(match[0]);
  return { lufs: Number(result.input_i), peakDbtp: Number(result.input_tp) };
}

async function duration(file) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

await mkdir(root, { recursive: true });
let cursor = 0;
let completed = 0;
const results = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < sources.length) {
    const source = sources[cursor++];
    if (hash(await readFile(source.local)) !== source.sha256) throw new Error(`Source changed: ${source.file}`);
    const destination = path.join(root, 'clips', source.file);
    const receiptPath = `${destination}.json`;
    let receipt = await json(receiptPath).catch(() => null);
    if (!receipt || receipt.sourceSha256 !== source.sha256 || receipt.targetLufs !== targetLufs
      || receipt.peakCeilingDbtp !== peakCeilingDbtp
      || receipt.after.peakDbtp > peakCeilingDbtp + 0.15
      || (Number.isFinite(receipt.after.lufs) && receipt.after.lufs > targetLufs + 0.15)
      || hash(await readFile(destination)) !== receipt.sha256) {
      const before = await measure(source.local);
      // Short clips below the BS.1770 window have no integrated measurement.
      // Only attenuate; peak headroom also constrains unusually dynamic tracks.
      let gainDb = Math.min(0, Number.isFinite(before.lufs) ? targetLufs - before.lufs : -9,
        peakCeilingDbtp - before.peakDbtp);
      if (!Number.isFinite(gainDb)) throw new Error(`Invalid gain: ${source.file}`);
      await mkdir(path.dirname(destination), { recursive: true });
      let after;
      for (let attempt = 0; attempt < 3; attempt++) {
        await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', source.local,
          '-af', `volume=${gainDb}dB`, '-ac', '1', '-b:a', '96k', '-map_metadata', '-1', destination]);
        after = await measure(destination);
        // MP3 encoding can overshoot: check the actual decoded copy, then
        // re-encode from the original with extra headroom when necessary.
        const excess = Math.max(after.peakDbtp - peakCeilingDbtp,
          Number.isFinite(after.lufs) ? after.lufs - targetLufs : 0);
        if (excess <= 0.15) break;
        if (attempt < 2) gainDb -= excess + 0.2;
      }
      const [sourceDuration, outputDuration] = await Promise.all([duration(source.local), duration(destination)]);
      if (Math.abs(sourceDuration - outputDuration) > 0.05 || after.peakDbtp > peakCeilingDbtp + 0.15
        || (Number.isFinite(after.lufs) && after.lufs > targetLufs + 0.15)) {
        throw new Error(`Loudness/timing verification failed: ${source.file}`);
      }
      const body = await readFile(destination);
      receipt = { source: source.file, sourceSha256: source.sha256, audio: prefix + source.file,
        targetLufs, peakCeilingDbtp, gainDb: Number(gainDb.toFixed(2)), before, after,
        durationSec: outputDuration, bytes: body.length, sha256: hash(body) };
      await writeFile(receiptPath, JSON.stringify(receipt) + '\n');
    }
    results.push(receipt);
    if (++completed % 100 === 0) console.log(`Verified ${completed}/${sources.length} normalized files.`);
  }
}));
results.sort((a, b) => a.source.localeCompare(b.source));
const manifest = { schemaVersion: 1, bookId: 1, prefix, targetLufs, peakCeilingDbtp,
  method: 'Constant attenuation per file; no trimming, time stretching or dynamic compression',
  count: results.length, files: results };
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

if (process.argv.includes('--upload')) {
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  if (!endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.VITE_AUDIO_BASE_URL) {
    throw new Error('R2 credentials and public audio base URL are required.');
  }
  const client = new S3Client({ region: 'auto', endpoint, forcePathStyle: true, maxAttempts: 8, credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  } });
  const bucket = process.env.R2_BUCKET_NAME || 'rongwaps-audio';
  let uploadCursor = 0;
  let uploaded = 0;
  try {
    await Promise.all(Array.from({ length: 12 }, async () => {
      while (uploadCursor < results.length) {
        const entry = results[uploadCursor++];
        const body = await readFile(path.join(root, 'clips', entry.source));
        if (hash(body) !== entry.sha256) throw new Error(`Output changed: ${entry.source}`);
        const etag = createHash('md5').update(body).digest('hex');
        const options = () => ({ abortSignal: AbortSignal.timeout(60_000) });
        let object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.audio }), options()).catch((error) => {
          if (error.$metadata?.httpStatusCode !== 404) throw error;
          return null;
        });
        if (!object) {
          await client.send(new PutObjectCommand({ Bucket: bucket, Key: entry.audio, Body: body,
            ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
            Metadata: { sha256: entry.sha256 }, IfNoneMatch: '*' }), options()).catch((error) => {
            // An acknowledged-late upload may already exist when the SDK retries.
            // The following HEAD still requires its exact size and checksums.
            if (error.$metadata?.httpStatusCode !== 412) throw error;
          });
          object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.audio }), options());
        }
        if (object.ContentLength !== entry.bytes || object.Metadata?.sha256 !== entry.sha256
          || object.ETag?.replaceAll('"', '') !== etag) {
          throw new Error(`Unverified R2 object: ${entry.source}`);
        }
        // These are single-part uploads: R2's ETag is the content MD5, also
        // served by the CDN. Verify it without re-downloading the whole book.
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await fetch(`${process.env.VITE_AUDIO_BASE_URL.replace(/\/+$/, '')}/${entry.audio}`,
              { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
            break;
          } catch (error) {
            if (attempt === 2) throw new Error(`Public audio unavailable: ${entry.source}`, { cause: error });
          }
        }
        if (!response.ok || response.headers.get('etag')?.replaceAll('"', '') !== etag
          || Number(response.headers.get('content-length')) !== entry.bytes
          || response.headers.get('content-type') !== 'audio/mpeg') {
          throw new Error(`Public audio differs: ${entry.source}`);
        }
        if (++uploaded % 100 === 0) console.log(`Published and checked ${uploaded}/${results.length} files.`);
      }
    }));
    await writeFile('content/audio/book1_loudness.json', JSON.stringify(manifest, null, 2) + '\n');
  } finally { client.destroy(); }
}
console.log(`Verified ${results.length} files${process.argv.includes('--upload') ? ' and public copies' : ' locally'}.`);
