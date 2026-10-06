/**
 * Upload the re-encoded official 時代華語 Book 1 audio to Cloudflare R2.
 *
 * Files land in the R2 bucket served at VITE_AUDIO_BASE_URL, so the client
 * streams them straight from the CDN.
 *
 * Usage:
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=... VITE_AUDIO_BASE_URL=... \
 *     node scripts/audio/uploadOfficialAudio.mjs [--dry-run]
 *
 * Source files: output/official-audio/book1/*.mp3 (see downloadOfficialAudio.mjs).
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = 'output/official-audio/book1';
const CONCURRENCY = 4;
const DRY_RUN = process.argv.includes('--dry-run');

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, VITE_AUDIO_BASE_URL } = process.env;
const BUCKET = process.env.R2_BUCKET_NAME || 'rongwaps-audio';
const endpoint = process.env.R2_ENDPOINT
  || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

if (!endpoint || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const files = (await readdir(SOURCE_DIR)).filter((name) => name.endsWith('.mp3')).sort();
if (files.length === 0) {
  console.error(`No mp3 files in ${SOURCE_DIR} — run scripts/audio/downloadOfficialAudio.mjs first.`);
  process.exit(1);
}

console.log(`Uploading ${files.length} files to ${BUCKET}${DRY_RUN ? ' (DRY RUN)' : ''}...`);

let cursor = 0;
let uploaded = 0;
const failures = [];

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    const localPath = path.join(SOURCE_DIR, file);
    const { size } = await stat(localPath);
    const body = await readFile(localPath);

    if (DRY_RUN) {
      console.log(`would upload ${file} (${size} bytes)`);
      uploaded += 1;
      continue;
    }

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: file, Body: body, ContentType: 'audio/mpeg',
      }));
      uploaded += 1;
      console.log(`ok   ${file} (${size} bytes)`);
    } catch (error) {
      failures.push({ file, error: error.message });
      console.error(`FAIL ${file}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\n${uploaded}/${files.length} uploaded to ${BUCKET}.`);

// Verify a sample of what the public client path would serve.
if (!DRY_RUN && uploaded === files.length && VITE_AUDIO_BASE_URL) {
  const base = VITE_AUDIO_BASE_URL.replace(/\/+$/, '');
  const samples = files.filter((file) => /-1-1\.mp3$/.test(file)).slice(0, 3);
  for (const file of samples) {
    const response = await fetch(`${base}/${file}`, { method: 'HEAD' });
    console.log(`verify ${file} -> ${response.status} ${response.headers.get('content-type')}`);
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} failures:`);
  for (const failure of failures) console.error(`  ${failure.file}: ${failure.error}`);
  process.exitCode = 1;
}
