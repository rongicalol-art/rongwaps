/** Import source-labelled CNS sounds from extracted female.zip. No synthesis or splitting; neutral WAVs are encoded to compact MP3.
 * npx tsx scripts/audio/importCnsAudio.ts --source-dir=... [--upload]
 * R2 credentials belong in the command environment, never generated output.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { characterReadings } from '../../src/utils/pinyin/characterReadings';
import { pronunciationKey } from '../../src/utils/pinyin/pronunciationMatching';
import { exportCnsAudioPack } from './exportCnsAudio';

const sourceDir = process.argv.find((arg) => arg.startsWith('--source-dir='))?.split('=').slice(1).join('=');
if (!sourceDir) throw new Error('Provide --source-dir pointing to the extracted official female.zip.');
const upload = process.argv.includes('--upload');
const prefix = 'pronunciation/cns-female-20250113/';
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const required = new Set<string>();
const neutralBookReadings = new Set<string>();
for (const book of [1, 2, 3, 4]) {
  const pack = JSON.parse(await readFile(`public/data/vocabulary/book-${book}.json`, 'utf8'));
  for (const item of pack.items) {
    const word = item.traditional || item.simplified;
    for (const form of word.split('/')) {
      const aligned = characterReadings(form.replace(/[()（）]/g, ''), item.pinyin, word);
      for (const readings of aligned?.readings ?? []) for (const key of readings) {
        required.add(key);
        if (/5$/.test(key)) neutralBookReadings.add(key);
      }
    }
  }
}
for (const file of (await readdir('public/data/dictionary')).filter((f) => /^shard-\d+\.json$/.test(f))) {
  const pack = JSON.parse(await readFile(path.join('public/data/dictionary', file), 'utf8'));
  if (pack.schemaVersion !== 2) throw new Error('Unsupported dictionary schema.');
  for (const row of pack.items) {
    if (Array.from(row[2] || row[1]).length !== 1) continue;
    const key = pronunciationKey(row[3]);
    if (key && !key.includes(' ')) required.add(key);
  }
}

const recordings: Array<{ reading: string; file: string; sourceFile: string; sha256: string; sourceSha256: string; bytes: Buffer }> = [];
for (const sourceFile of (await readdir(sourceDir)).sort()) {
  const neutral = /^F_[a-z]+5\.wav$/.test(sourceFile);
  if (!neutral && !/^F_[a-z]+[1-4]?\.mp3$/.test(sourceFile)) continue;
  const spelling = sourceFile.slice(2, -4);
  const reading = pronunciationKey(/\d$/.test(spelling) ? spelling : `${spelling}1`);
  if (!reading || reading.includes(' ') || !required.has(reading) || (neutral && !neutralBookReadings.has(reading))) continue;
  const sourceBytes = await readFile(path.join(sourceDir, sourceFile));
  let bytes = sourceBytes;
  if (neutral) {
    const encoded = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(sourceDir, sourceFile), '-map_metadata', '-1', '-ac', '1', '-ar', '44100', '-b:a', '96k', '-f', 'mp3', 'pipe:1']);
    if (encoded.status !== 0 || encoded.stderr.length) throw new Error(`Cannot encode ${sourceFile}`);
    bytes = encoded.stdout;
  }
  const sha256 = hash(bytes);
  recordings.push({ reading, file: `${reading.replace(/ü/g, 'v')}-${sha256.slice(0, 12)}.mp3`, sourceFile, sha256, sourceSha256: hash(sourceBytes), bytes });
}
if (!recordings.length || recordings.length > 1500) throw new Error('Unexpected CNS selection size.');
if (new Set(recordings.map((r) => r.reading)).size !== recordings.length) throw new Error('Duplicate source reading.');
// Decoder errors fail closed. This verifies integrity, not human listening quality.
for (const recording of recordings) {
  const decoded = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(sourceDir, recording.sourceFile), '-f', 'null', '-'], { encoding: 'utf8' });
  if (decoded.status !== 0 || decoded.stderr.trim()) throw new Error(`Cannot decode ${recording.sourceFile}; ffmpeg is required.`);
}

const items = Object.fromEntries(recordings.map((r) => [r.reading, r.file]));
const pack = { schemaVersion: 1, count: recordings.length, prefix, items };
const json = JSON.stringify(pack);
const version = hash(json).slice(0, 16);
const provenance = {
  source: '數位發展部，CNS11643中文標準交換碼全字庫',
  release: 'Voice.zip, Last-Modified 2025-01-13',
  url: 'https://www.cns11643.gov.tw/opendata/Voice.zip',
  dataset: 'https://data.gov.tw/dataset/5961',
  license: 'Open Government Data License, version 1.0',
  licenseUrl: 'https://data.gov.tw/license',
  attribution: '數位發展部 2025 CNS11643中文標準交換碼全字庫（聲音檔）。此開放資料依政府資料開放授權條款進行公眾釋出。',
  selection: 'Original female citation-tone MP3s plus source-labelled book neutral-tone WAVs encoded as mono 44.1 kHz 96 kbps MP3. Exact pinyin + tone; no synthesis or splitting. Isolated neutral sounds are reference readings, not a claim about contextual pitch.',
  listeningReview: 'Not performed by this import script; source metadata and decoder validation are separate from listening verification.',
  version,
  recordings: recordings.map(({ reading, file, sourceFile, sha256, sourceSha256, bytes }) => ({ reading, file: prefix + file, sourceFile, sha256, sourceSha256, bytes: bytes.length })),
};
await mkdir('output/audio/cns', { recursive: true });
await writeFile('output/audio/cns/import-preview.json', JSON.stringify(provenance, null, 2) + '\n');
console.log(`Selected ${recordings.length} clips; ${recordings.reduce((sum, r) => sum + r.bytes.length, 0)} bytes; index ${Buffer.byteLength(json)} bytes.`);
if (!upload) {
  console.log('Preview only. No uploads or published pack changes.');
} else {
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('R2 upload configuration unavailable.');
  const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
  const bucket = process.env.R2_BUCKET_NAME || 'rongwaps-audio';
  let cursor = 0;
  let uploaded = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < recordings.length) {
      const r = recordings[cursor++];
      const key = prefix + r.file;
      let existing;
      try { existing = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); }
      catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
      }
      if (existing) {
        if (existing.ContentLength !== r.bytes.length || existing.Metadata?.['source-sha256'] !== r.sha256) throw new Error(`Existing object differs: ${r.file}`);
      } else {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: r.bytes, ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable', Metadata: { 'source-sha256': r.sha256 }, IfNoneMatch: '*' }));
        uploaded++;
      }
    }
  }));
  // Publish metadata only after every referenced asset exists. Never replace course packs/audio.
  await writeFile('content/audio/cns_pronunciation_audio.json', JSON.stringify(provenance, null, 2) + '\n');
  await exportCnsAudioPack();
  console.log(`Uploaded ${uploaded}; verified ${recordings.length} R2 objects. Published lookup index ${version}.`);
}
