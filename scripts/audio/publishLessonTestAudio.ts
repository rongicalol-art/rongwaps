/**
 * Publish the lesson-test studio clips to R2 and write their receipt (content/audio/lesson_test_audio.json),
 * which `npm run lesson-tests:export` attaches to every spoken line.
 *
 *   node --env-file=<.env> --import tsx scripts/audio/publishLessonTestAudio.ts                     # check only
 *   node --env-file=<.env> --import tsx scripts/audio/publishLessonTestAudio.ts --upload --male dylan
 *
 * Reads output/lesson-test-audio/manifest.json and sounds.json (generateLessonTestAudio.py). Every sentence
 * clip must have passed checkStudioBatch.py (`quality.contentChecked`) and the loudness limits; each file is
 * uploaded once to its immutable hashed key and verified before the receipt is written. `--male` picks the
 * male dialogue voice the owner chose by ear (Qwen batches). A Yating batch (generateLessonTestAudio.py
 * --engine yating) also writes voices.json, each test's voice per role, copied into the receipt as
 * `lessonVoices`. A batch may hold only some tests (new ones, or re-voiced ones): its clips, voices and sounds are
 * added to the receipt and replace what they name, and everything else in the receipt stays. R2 settings come from
 * the environment and are never printed.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface Clip {
  key: string;
  text: string;
  voice: string;
  file: string;
  local: string;
  sha256: string;
  duration?: number;
  quality?: { integratedLufs: number; truePeakDbfs: number; contentChecked?: boolean };
}

interface Receipt {
  voices: Record<'F' | 'M' | 'N', string>;
  lessonVoices?: Record<string, Record<'F' | 'M' | 'N', string>>;
  clips: Record<string, { file: string; sha256: string; duration?: number }>;
  sounds: { ding: { file: string; sha256: string }; letters: Record<string, { file: string; sha256: string }> };
}

const ROOT = process.cwd();
const BATCH = path.join(ROOT, 'output/lesson-test-audio');
const RECEIPT = path.join(ROOT, 'content/audio/lesson_test_audio.json');
const MALE: Record<string, string> = { dylan: 'Dylan', uncle_fu: 'Uncle_Fu' };
const hash = (body: Buffer, algorithm = 'sha256') => createHash(algorithm).update(body).digest('hex');

async function main() {
  const upload = process.argv.includes('--upload');
  const maleArg = process.argv[process.argv.indexOf('--male') + 1];
  const male = MALE[process.argv.includes('--male') ? maleArg : 'dylan'];
  if (!male) throw new Error('--male must be dylan or uncle_fu');
  const entries = JSON.parse(await readFile(path.join(BATCH, 'manifest.json'), 'utf8')) as Clip[];
  const sounds = JSON.parse(await readFile(path.join(BATCH, 'sounds.json'), 'utf8')) as { ding: Clip; letters?: Record<string, Clip> };
  const letters = sounds.letters ?? {};
  const files: Clip[] = [...entries, sounds.ding, ...Object.values(letters)];
  for (const entry of entries) {
    const q = entry.quality;
    if (!q || q.integratedLufs < -17 || q.integratedLufs > -9 || q.truePeakDbfs > -1 || !q.contentChecked) {
      throw new Error(`Audio quality check incomplete (run checkStudioBatch.py): ${entry.key}`);
    }
  }

  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (upload && (!endpoint || !accessKeyId || !secretAccessKey)) throw new Error('R2 configuration unavailable.');
  const client = upload ? new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } }) : null;
  const bucket = process.env.R2_BUCKET_NAME || 'rongwaps-audio';

  let cursor = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < files.length) {
      const entry = files[cursor++];
      if (!/^lesson-test-studio\/v1\/[0-9a-f]{12}\.mp3$/.test(entry.file)) throw new Error(`Unexpected key: ${entry.file}`);
      const body = await readFile(path.join(ROOT, entry.local));
      if (hash(body) !== entry.sha256) throw new Error(`Local clip changed since it was checked: ${entry.file}`);
      if (!client) continue;
      // Each request gets its own 30 s limit and up to four tries: one slow answer must not end a batch of thousands.
      const send = async <T>(request: (options: { abortSignal: AbortSignal }) => Promise<T>): Promise<T> => {
        for (let attempt = 1; ; attempt += 1) {
          try {
            return await request({ abortSignal: AbortSignal.timeout(30_000) });
          } catch (error) {
            const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
            if (attempt === 4 || (status !== undefined && status < 500)) throw error;
            await new Promise((resolve) => { setTimeout(resolve, 1000 * attempt); });
          }
        }
      };
      const head = () => send((options) => client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.file }), options));
      let object = await head().catch((error: unknown) => {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
        return undefined;
      });
      if (!object) {
        await send((options) => client.send(new PutObjectCommand({
          Bucket: bucket, Key: entry.file, Body: body, ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256: entry.sha256 }, IfNoneMatch: '*',
        }), options)).catch((error: unknown) => {
          // A retried upload whose first try did arrive answers 412 (the key exists): the check below verifies it.
          if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 412) throw error;
        });
        object = await head();
      }
      if (object.ContentLength !== body.length || object.Metadata?.sha256 !== entry.sha256
        || object.ETag?.replaceAll('"', '') !== hash(body, 'md5')) throw new Error(`Unverified R2 object: ${entry.file}`);
    }
  }));
  client?.destroy();
  if (!upload) {
    console.log(`Checked ${files.length} local clips; run with --upload to publish.`);
    return;
  }
  // A Yating batch names each test's voices (their pace differs per lesson) in voices.json.
  const lessonVoices = await readFile(path.join(BATCH, 'voices.json'), 'utf8')
    .then((text) => JSON.parse(text) as Record<string, Record<'F' | 'M' | 'N', string>>)
    .catch(() => undefined);
  // The receipt keeps every test this batch doesn't hold (a batch can be only the new tests).
  const previous = await readFile(RECEIPT, 'utf8').then((text) => JSON.parse(text) as Receipt).catch(() => undefined);
  const clips: Receipt['clips'] = { ...previous?.clips };
  for (const entry of entries) clips[entry.key] = { file: entry.file, sha256: entry.sha256, duration: entry.duration };
  const mergedVoices = { ...previous?.lessonVoices, ...lessonVoices };
  const receipt: Receipt = {
    voices: { F: 'Vivian', M: male, N: 'Serena' },
    ...(Object.keys(mergedVoices).length ? { lessonVoices: mergedVoices } : {}),
    clips: Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b))),
    sounds: {
      ding: { file: sounds.ding.file, sha256: sounds.ding.sha256 },
      // A Yating batch reuses the published A–D letters instead of rendering them again.
      letters: Object.keys(letters).length
        ? Object.fromEntries(Object.entries(letters).map(([letter, clip]) => [letter, { file: clip.file, sha256: clip.sha256 }]))
        : previous?.sounds.letters ?? {},
    },
  };
  await writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Published ${files.length} clips; wrote ${path.relative(ROOT, RECEIPT)}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
