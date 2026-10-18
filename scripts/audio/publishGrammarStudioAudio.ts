/**
 * Publish the owner-approved voice B (studio) grammar clips to R2 and write their receipt.
 *
 * Reads output/grammar-audio/studio-manifest.json (written by generateGrammarStudioAudio.py and
 * approved by ear), checks every local file against its sha256, uploads each to its immutable key
 * (`grammar-studio/v1/<hash>.mp3`, never overwriting), verifies the stored object, and only then
 * writes content/audio/grammar_studio_audio.json, which `npm run content:export` attaches as
 * `audio = { voice: 'studio', file }` to sentences the book doesn't say.
 *
 *   node --import dotenv/config --import tsx scripts/audio/publishGrammarStudioAudio.ts            # check only
 *   node --import dotenv/config --import tsx scripts/audio/publishGrammarStudioAudio.ts --upload   # upload + receipt
 *
 * R2 settings come from the environment (R2_ACCOUNT_ID or R2_ENDPOINT, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME); they are never printed.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface StudioEntry {
  key: string;
  text: string;
  spoken: string;
  file: string;
  local: string;
  duration: number;
  sha256: string;
  model: string;
  voice: string;
  instruct: string;
  seed: number;
}

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'output/grammar-audio/studio-manifest.json');
const RECEIPT = path.join(ROOT, 'content/audio/grammar_studio_audio.json');
const APPROVED = 'owner 2026-10-18';
const hash = (body: Buffer, algorithm = 'sha256') => createHash(algorithm).update(body).digest('hex');

async function main() {
  const upload = process.argv.includes('--upload');
  const entries = JSON.parse(await readFile(MANIFEST, 'utf8')) as StudioEntry[];
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (upload && (!endpoint || !accessKeyId || !secretAccessKey)) throw new Error('R2 configuration unavailable.');
  const client = upload ? new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } }) : null;
  const bucket = process.env.R2_BUCKET_NAME || 'rongwaps-audio';

  let cursor = 0;
  let done = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      if (!/^grammar-studio\/v1\/[0-9a-f]{12}\.mp3$/.test(entry.file)) throw new Error(`Unexpected key: ${entry.file}`);
      const body = await readFile(path.join(ROOT, entry.local));
      if (hash(body) !== entry.sha256) throw new Error(`Local clip changed since review: ${entry.key}`);
      if (client) {
        const options = { abortSignal: AbortSignal.timeout(30_000) };
        const head = () => client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.file }), options);
        let object = await head().catch((error: unknown) => {
          if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
          return undefined;
        });
        if (!object) {
          await client.send(new PutObjectCommand({
            Bucket: bucket, Key: entry.file, Body: body, ContentType: 'audio/mpeg',
            CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256: entry.sha256 }, IfNoneMatch: '*',
          }), options);
          object = await head();
        }
        if (object.ContentLength !== body.length || object.Metadata?.sha256 !== entry.sha256
          || object.ETag?.replaceAll('"', '') !== hash(body, 'md5')) throw new Error(`Unverified R2 object: ${entry.file}`);
      }
      done++;
      if (done % 25 === 0) console.log(`Verified ${done}/${entries.length}`);
    }
  }));
  client?.destroy();
  if (!upload) {
    console.log(`Checked ${entries.length} local clips; run with --upload to publish.`);
    return;
  }
  const receipt = Object.fromEntries([...entries].sort((a, b) => a.key.localeCompare(b.key)).map((entry) => [entry.key, {
    file: entry.file, sha256: entry.sha256, duration: entry.duration, spoken: entry.spoken,
    model: entry.model, voice: entry.voice, instruct: entry.instruct, seed: entry.seed, approved: APPROVED,
  }]));
  await writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Published ${entries.length} studio clips; wrote ${path.relative(ROOT, RECEIPT)}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
